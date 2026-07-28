package com.dailyhisab.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import com.dailyhisab.nativeapp.data.FinanceDatabase
import com.dailyhisab.nativeapp.data.NoteEntity
import com.dailyhisab.nativeapp.data.RecurringEntity
import com.dailyhisab.nativeapp.data.ReminderEntity
import com.dailyhisab.nativeapp.data.TransactionEntity
import kotlinx.coroutines.launch

private val Navy = Color(0xFF07194E)
private val Blue = Color(0xFF11298F)
private val Orange = Color(0xFFF97316)
private val Green = Color(0xFF16A34A)
private val Red = Color(0xFFEF4444)
private val Ink = Color(0xFF111936)
private val Muted = Color(0xFF69718A)
private val Soft = Color(0xFFF5F7FF)

data class Expense(
    val id: Long = 0,
    val title: String,
    val category: String,
    val amount: Int,
    val date: String,
    val time: String,
    val income: Boolean = false,
    val note: String = ""
)
enum class Screen { Home, Reports, Add, Entries, Categories, Budget, Calendar, Profile, Recurring, Reminders, Notes }

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { DailyHisabApp() }
    }
}

@Composable
fun DailyHisabApp() {
    var screen by remember { mutableStateOf(Screen.Home) }
    val context = LocalContext.current
    val dao = remember { FinanceDatabase.get(context).transactionDao() }
    val scope = rememberCoroutineScope()
    val storedTransactions by dao.observeAll().collectAsState(initial = emptyList())
    val recurringDao = remember { FinanceDatabase.get(context).recurringDao() }
    val reminderDao = remember { FinanceDatabase.get(context).reminderDao() }
    val noteDao = remember { FinanceDatabase.get(context).noteDao() }
    val recurringItems by recurringDao.observeAll().collectAsState(initial = emptyList())
    val reminders by reminderDao.observeAll().collectAsState(initial = emptyList())
    val notes by noteDao.observeAll().collectAsState(initial = emptyList())
    val expenses = storedTransactions.map {
        Expense(it.id, it.title, it.category, it.amount, it.date, it.time, it.type == "income", it.note)
    }

    LaunchedEffect(storedTransactions) {
        if (storedTransactions.isEmpty()) {
            listOf(
                TransactionEntity(title = "Groceries", category = "Food", amount = 120, date = "2026-07-28", time = "10:30 AM", type = "expense"),
                TransactionEntity(title = "Transport (Ride)", category = "Transport", amount = 100, date = "2026-07-28", time = "09:15 AM", type = "expense"),
                TransactionEntity(title = "Salary", category = "Income", amount = 2500, date = "2026-07-27", time = "09:00 AM", type = "income"),
                TransactionEntity(title = "Electricity Bill", category = "Utilities", amount = 150, date = "2026-07-10", time = "08:40 PM", type = "expense")
            ).forEach { dao.insert(it) }
        }
    }

    MaterialTheme(
        colorScheme = lightColorScheme(primary = Blue, secondary = Orange, surface = Color.White, background = Soft),
        typography = Typography()
    ) {
        Scaffold(
            containerColor = Soft,
            bottomBar = { BottomNavigation(screen) { screen = it } },
            floatingActionButton = {
                FloatingActionButton(
                    onClick = { screen = Screen.Add },
                    shape = CircleShape,
                    containerColor = Blue,
                    contentColor = Color.White,
                    modifier = Modifier.size(66.dp)
                ) { Icon(Icons.Default.Add, "Add", modifier = Modifier.size(32.dp)) }
            },
            floatingActionButtonPosition = FabPosition.Center
        ) { padding ->
            Box(Modifier.padding(padding).fillMaxSize()) {
                when (screen) {
                    Screen.Home -> HomeScreen(expenses, onNavigate = { screen = it })
                    Screen.Reports -> ReportsScreen(expenses)
                    Screen.Add -> AddExpenseScreen { expense ->
                        scope.launch {
                            dao.insert(
                                TransactionEntity(
                                    title = expense.title,
                                    category = expense.category,
                                    amount = expense.amount,
                                    date = expense.date,
                                    time = expense.time,
                                    type = if (expense.income) "income" else "expense",
                                    note = expense.note
                                )
                            )
                            screen = Screen.Home
                        }
                    }
                    Screen.Entries -> EntriesScreen(expenses) { item -> scope.launch { dao.delete(storedTransactions.first { it.id == item.id }) } }
                    Screen.Categories -> CategoriesScreen(expenses)
                    Screen.Budget -> BudgetScreen(expenses)
                    Screen.Calendar -> CalendarScreen(expenses)
                    Screen.Profile -> ProfileScreen(onNavigate = { screen = it })
                    Screen.Recurring -> RecurringScreen(
                        recurringItems,
                        onAdd = { scope.launch { recurringDao.insert(it) } },
                        onDelete = { scope.launch { recurringDao.delete(it) } }
                    )
                    Screen.Reminders -> RemindersScreen(
                        reminders,
                        onAdd = { scope.launch { reminderDao.insert(it) } },
                        onToggle = { item -> scope.launch { reminderDao.setCompleted(item.id, !item.completed) } },
                        onDelete = { scope.launch { reminderDao.delete(it) } }
                    )
                    Screen.Notes -> NotesScreen(
                        notes,
                        onAdd = { scope.launch { noteDao.insert(it) } },
                        onPin = { item -> scope.launch { noteDao.setPinned(item.id, !item.pinned) } },
                        onDelete = { scope.launch { noteDao.delete(it) } }
                    )
                }
            }
        }
    }
}

@Composable
private fun AppHeader(title: String = "Daily Hisab", subtitle: String? = null) {
    Row(
        modifier = Modifier.fillMaxWidth().background(Color.White).statusBarsPadding().padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(shape = RoundedCornerShape(14.dp), color = Blue, modifier = Modifier.size(46.dp)) {
            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.AccountBalanceWallet, null, tint = Color.White) }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(title, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
            subtitle?.let { Text(it, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Muted) }
        }
        BadgedBox(badge = { Badge(containerColor = Orange) }) {
            IconButton(onClick = {}) { Icon(Icons.Default.NotificationsNone, "Notifications", tint = Ink) }
        }
    }
}

@Composable
private fun HomeScreen(expenses: List<Expense>, onNavigate: (Screen) -> Unit) {
    val spent = expenses.filterNot { it.income }.sumOf { it.amount }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { AppHeader(subtitle = "Your Daily Expense Tracker") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                BalanceHero(spent)
                Text("Quick Add", fontWeight = FontWeight.Bold, color = Ink)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    QuickAction("Expense", Icons.Default.ShoppingBag, Red) { onNavigate(Screen.Add) }
                    QuickAction("Income", Icons.Default.Payments, Green) { onNavigate(Screen.Add) }
                    QuickAction("Categories", Icons.Default.GridView, Color(0xFF7C3AED)) { onNavigate(Screen.Categories) }
                    QuickAction("Budget", Icons.Default.AccountBalance, Muted) { onNavigate(Screen.Budget) }
                }
                MonthOverview(spent)
                Row(
                    Modifier.fillMaxWidth().clickable { onNavigate(Screen.Entries) },
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Recent Transactions", fontWeight = FontWeight.ExtraBold, color = Ink)
                    Text("See all", color = Blue, fontWeight = FontWeight.Bold)
                }
            }
        }
        items(expenses.take(5)) { TransactionRow(it) }
    }
}

@Composable
private fun BalanceHero(spent: Int) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            Modifier.background(Brush.linearGradient(listOf(Navy, Blue, Color(0xFF1949C6)))).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("July 2026  •  Monthly Summary", color = Color.White.copy(.78f), fontSize = 12.sp)
                Text("Wallet Balance", color = Color.White.copy(.78f), fontSize = 12.sp)
            }
            Text("৳ 2,140", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
            HorizontalDivider(color = Color.White.copy(.16f))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                HeroMetric("Income", "৳ 2,700", Green)
                HeroMetric("Expense", "৳ $spent", Color(0xFFFF7A7A))
                HeroMetric("Savings", "৳ ${2700 - spent}", Color.White)
            }
        }
    }
}

@Composable
private fun HeroMetric(label: String, value: String, color: Color) {
    Column { Text(label, color = Color.White.copy(.68f), fontSize = 10.sp); Text(value, color = color, fontWeight = FontWeight.Bold) }
}

@Composable
private fun QuickAction(label: String, icon: ImageVector, color: Color, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clickable(onClick = onClick)) {
        Surface(shape = RoundedCornerShape(16.dp), color = color.copy(.1f), modifier = Modifier.size(54.dp)) {
            Box(contentAlignment = Alignment.Center) { Icon(icon, label, tint = color) }
        }
        Spacer(Modifier.height(6.dp))
        Text(label, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Ink)
    }
}

@Composable
private fun MonthOverview(spent: Int) {
    AppCard {
        SectionTitle("This Month Overview", "July 2026")
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(116.dp).background(Brush.sweepGradient(listOf(Orange, Color(0xFF8B5CF6), Green, Red, Orange)), CircleShape), contentAlignment = Alignment.Center) {
                Surface(Modifier.size(78.dp), CircleShape, color = Color.White) {
                    Box(contentAlignment = Alignment.Center) { Text("৳ $spent\nTotal", fontWeight = FontWeight.Bold, color = Ink) }
                }
            }
            Spacer(Modifier.width(18.dp))
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Legend("Food", "৳ 120", Orange)
                Legend("Transport", "৳ 100", Color(0xFF8B5CF6))
                Legend("Utilities", "৳ 150", Green)
                Legend("Others", "৳ ${maxOf(spent - 370, 0)}", Red)
            }
        }
    }
}

@Composable
private fun Legend(name: String, value: String, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(9.dp).background(color, CircleShape)); Spacer(Modifier.width(8.dp))
        Text(name, Modifier.weight(1f), fontSize = 12.sp, color = Muted); Text(value, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Ink)
    }
}

@Composable
private fun TransactionRow(expense: Expense) {
    Row(
        Modifier.padding(horizontal = 16.dp, vertical = 5.dp).fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp)).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(shape = RoundedCornerShape(12.dp), color = (if (expense.income) Green else Red).copy(.1f), modifier = Modifier.size(42.dp)) {
            Box(contentAlignment = Alignment.Center) { Icon(if (expense.income) Icons.Default.Work else Icons.Default.ReceiptLong, null, tint = if (expense.income) Green else Red) }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(expense.title, fontWeight = FontWeight.Bold, color = Ink)
            Text("${expense.category} • ${expense.time}", fontSize = 11.sp, color = Muted)
        }
        Text("${if (expense.income) "+" else "-"}৳ ${expense.amount}", color = if (expense.income) Green else Red, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ReportsScreen(expenses: List<Expense>) {
    val spent = expenses.filterNot { it.income }.sumOf { it.amount }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Reports") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(true, {}, { Text("This Month") })
                    FilterChip(false, {}, { Text("Last Month") })
                    FilterChip(false, {}, { Text("This Year") })
                }
                BalanceHero(spent)
                AppCard {
                    Text("Income vs Expense", fontWeight = FontWeight.Bold, color = Ink)
                    Spacer(Modifier.height(22.dp))
                    Row(Modifier.fillMaxWidth().height(150.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
                        listOf(55, 80, 65, 92, 72, 100).forEachIndexed { index, height ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Row(verticalAlignment = Alignment.Bottom) {
                                    Box(Modifier.width(14.dp).height(height.dp).background(Green, RoundedCornerShape(4.dp)))
                                    Spacer(Modifier.width(4.dp))
                                    Box(Modifier.width(14.dp).height((height * .55).dp).background(Red, RoundedCornerShape(4.dp)))
                                }
                                Text(listOf("Feb", "Mar", "Apr", "May", "Jun", "Jul")[index], fontSize = 9.sp, color = Muted)
                            }
                        }
                    }
                }
                MonthOverview(spent)
            }
        }
    }
}

@Composable
private fun AddExpenseScreen(onSave: (Expense) -> Unit) {
    var amount by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("Food") }
    var title by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var isIncome by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().background(Color.White)) {
        AppHeader("Add Expense")
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(selected = !isIncome, onClick = { isIncome = false }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Expense") }
                    SegmentedButton(selected = isIncome, onClick = { isIncome = true }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Income") }
                }
            }
            item {
                OutlinedTextField(
                    value = amount, onValueChange = { amount = it.filter(Char::isDigit) },
                    label = { Text("Amount") }, leadingIcon = { Text("৳", fontSize = 24.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)
                )
            }
            item {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Title") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
            }
            item {
                Text("Category", fontWeight = FontWeight.Bold, color = Ink)
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Food", "Transport", "Shopping", "Bills").forEach { name ->
                        FilterChip(category == name, { category = name }, { Text(name) })
                    }
                }
            }
            item { OutlinedTextField("Jul 28, 2026", {}, label = { Text("Date") }, readOnly = true, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) }
            item { OutlinedTextField(note, { note = it }, label = { Text("Note (Optional)") }, modifier = Modifier.fillMaxWidth().height(110.dp), shape = RoundedCornerShape(16.dp)) }
            item {
                OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth().height(62.dp), shape = RoundedCornerShape(16.dp)) {
                    Icon(Icons.Default.UploadFile, null); Spacer(Modifier.width(8.dp)); Text("Upload Receipt")
                }
            }
        }
        Button(
            onClick = {
                if (amount.isNotBlank()) onSave(
                    Expense(
                        title = title.ifBlank { category },
                        category = if (isIncome && category == "Food") "Income" else category,
                        amount = amount.toInt(),
                        date = "2026-07-28",
                        time = "Just now",
                        income = isIncome,
                        note = note
                    )
                )
            },
            modifier = Modifier.padding(16.dp).fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp),
            enabled = amount.isNotBlank()
        ) { Text(if (isIncome) "Save Income" else "Save Expense", fontWeight = FontWeight.Bold) }
    }
}

@Composable
private fun CalendarScreen(expenses: List<Expense>) {
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Calendar") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Text("‹               July 2026               ›", Modifier.fillMaxWidth(), textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold, color = Ink)
                    Spacer(Modifier.height(18.dp))
                    val days = (1..31).toList()
                    days.chunked(7).forEach { week ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            week.forEach { day ->
                                Surface(shape = CircleShape, color = if (day == 28) Blue else Color.Transparent, modifier = Modifier.size(38.dp)) {
                                    Box(contentAlignment = Alignment.Center) { Text("$day", color = if (day == 28) Color.White else Ink, fontWeight = FontWeight.SemiBold) }
                                }
                            }
                            repeat(7 - week.size) { Spacer(Modifier.size(38.dp)) }
                        }
                    }
                }
                SectionTitle("Tuesday, July 28", "৳ ${expenses.filterNot { it.income }.sumOf { it.amount }}")
            }
        }
        items(expenses.filterNot { it.income }) { TransactionRow(it) }
    }
}

@Composable
private fun EntriesScreen(expenses: List<Expense>, onDelete: (Expense) -> Unit) {
    var filter by remember { mutableStateOf("All") }
    val visible = expenses.filter {
        filter == "All" || (filter == "Income" && it.income) || (filter == "Expense" && !it.income)
    }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("All Entries") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("All", "Income", "Expense").forEach { option ->
                        FilterChip(filter == option, { filter = option }, { Text(option) })
                    }
                }
                AppCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        SummaryMetric("Income", expenses.filter { it.income }.sumOf { it.amount }, Green)
                        SummaryMetric("Expense", expenses.filterNot { it.income }.sumOf { it.amount }, Red)
                        SummaryMetric("Balance", expenses.sumOf { if (it.income) it.amount else -it.amount }, Blue)
                    }
                }
            }
        }
        items(visible, key = { it.id }) { expense ->
            Row(
                Modifier.padding(horizontal = 16.dp, vertical = 5.dp).fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp)).padding(10.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(Modifier.weight(1f)) { TransactionRowContent(expense) }
                IconButton(onClick = { onDelete(expense) }) { Icon(Icons.Default.DeleteOutline, "Delete", tint = Red) }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun SummaryMetric(label: String, amount: Int, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = Muted)
        Text("৳ $amount", fontWeight = FontWeight.ExtraBold, color = color)
    }
}

@Composable
private fun TransactionRowContent(expense: Expense) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Surface(shape = RoundedCornerShape(12.dp), color = (if (expense.income) Green else Red).copy(.1f), modifier = Modifier.size(42.dp)) {
            Box(contentAlignment = Alignment.Center) { Icon(if (expense.income) Icons.Default.Work else Icons.Default.ReceiptLong, null, tint = if (expense.income) Green else Red) }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(expense.title, fontWeight = FontWeight.Bold, color = Ink)
            Text("${expense.category} • ${expense.date}", fontSize = 11.sp, color = Muted)
        }
        Text("${if (expense.income) "+" else "-"}৳ ${expense.amount}", color = if (expense.income) Green else Red, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun CategoriesScreen(expenses: List<Expense>) {
    val categories = listOf(
        Triple("Food", Icons.Default.Restaurant, Orange),
        Triple("Transport", Icons.Default.DirectionsBus, Color(0xFF8B5CF6)),
        Triple("Shopping", Icons.Default.ShoppingBag, Red),
        Triple("Utilities", Icons.Default.Bolt, Color(0xFFF59E0B)),
        Triple("Health", Icons.Default.Favorite, Color(0xFFEC4899)),
        Triple("Education", Icons.Default.School, Blue),
        Triple("Entertainment", Icons.Default.SentimentSatisfied, Color(0xFF7C3AED)),
        Triple("Others", Icons.Default.MoreHoriz, Muted)
    )
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Categories") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField("", {}, readOnly = true, leadingIcon = { Icon(Icons.Default.Search, null) }, placeholder = { Text("Search categories") }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp))
                categories.chunked(2).forEach { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { (name, icon, color) ->
                            Card(
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White)
                            ) {
                                Column(Modifier.fillMaxWidth().padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Surface(Modifier.size(48.dp), RoundedCornerShape(14.dp), color = color.copy(.12f)) {
                                        Box(contentAlignment = Alignment.Center) { Icon(icon, null, tint = color) }
                                    }
                                    Spacer(Modifier.height(8.dp))
                                    Text(name, fontWeight = FontWeight.Bold, color = Ink)
                                    Text("৳ ${expenses.filter { !it.income && it.category == name }.sumOf { it.amount }}", color = Muted)
                                }
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
                Button(onClick = {}, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.Add, null); Text("Add Category") }
            }
        }
    }
}

@Composable
private fun BudgetScreen(expenses: List<Expense>) {
    val budget = 2500
    val spent = expenses.filterNot { it.income }.sumOf { it.amount }
    val progress = (spent.toFloat() / budget).coerceIn(0f, 1f)
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Budget") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column { Text("Monthly Budget", color = Muted); Text("৳ $budget", fontSize = 26.sp, fontWeight = FontWeight.ExtraBold, color = Ink) }
                        Column(horizontalAlignment = Alignment.End) { Text("Spent", color = Muted); Text("৳ $spent", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Red) }
                    }
                    Spacer(Modifier.height(14.dp))
                    LinearProgressIndicator(progress = { progress }, modifier = Modifier.fillMaxWidth().height(12.dp), color = Orange, trackColor = Color(0xFFFFE4E6))
                    Spacer(Modifier.height(8.dp))
                    Text("${(progress * 100).toInt()}% used • ৳ ${maxOf(budget - spent, 0)} remaining", color = Muted, fontSize = 12.sp)
                }
                AppCard {
                    Text("Daily Allowance", color = Muted)
                    Text("৳ ${maxOf(budget - spent, 0) / 4}", fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = Blue)
                    Text("Recommended spending for the remaining days", fontSize = 11.sp, color = Muted)
                }
                Text("Budget by Category", fontWeight = FontWeight.ExtraBold, color = Ink)
                listOf("Food" to 500, "Transport" to 400, "Shopping" to 600, "Utilities" to 300).forEach { (name, limit) ->
                    val categorySpent = expenses.filter { !it.income && it.category == name }.sumOf { it.amount }
                    AppCard {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(name, fontWeight = FontWeight.Bold, color = Ink)
                            Text("৳ $categorySpent / ৳ $limit", fontSize = 12.sp, color = Muted)
                        }
                        Spacer(Modifier.height(8.dp))
                        LinearProgressIndicator(progress = { (categorySpent.toFloat() / limit).coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth(), color = if (categorySpent > limit) Red else Blue)
                    }
                }
            }
        }
    }
}

@Composable
private fun RecurringScreen(
    items: List<RecurringEntity>,
    onAdd: (RecurringEntity) -> Unit,
    onDelete: (RecurringEntity) -> Unit
) {
    var showAdd by remember { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Recurring Expenses") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Text("Monthly Recurring Total", color = Muted)
                    Text("৳ ${items.sumOf { it.amount }}", fontSize = 30.sp, fontWeight = FontWeight.ExtraBold, color = Green)
                    Text("${items.size} active recurring items", color = Muted, fontSize = 12.sp)
                }
                Button(onClick = { showAdd = true }, modifier = Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Add, null); Text("Add Recurring Expense")
                }
            }
        }
        items(items, key = { it.id }) { item ->
            Row(
                Modifier.padding(horizontal = 16.dp, vertical = 5.dp).fillMaxWidth().background(Color.White, RoundedCornerShape(16.dp)).padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(Modifier.size(44.dp), RoundedCornerShape(12.dp), color = Green.copy(.1f)) {
                    Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Repeat, null, tint = Green) }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(item.title, fontWeight = FontWeight.Bold, color = Ink)
                    Text("${item.frequency} • Next: ${item.nextDueDate}", fontSize = 11.sp, color = Muted)
                }
                Text("৳ ${item.amount}", fontWeight = FontWeight.Bold, color = Red)
                IconButton(onClick = { onDelete(item) }) { Icon(Icons.Default.DeleteOutline, "Delete", tint = Muted) }
            }
        }
    }
    if (showAdd) {
        AddItemDialog(
            title = "Add Recurring Expense",
            amountEnabled = true,
            onDismiss = { showAdd = false }
        ) { name, detail, amount ->
            onAdd(RecurringEntity(title = name, amount = amount, frequency = "Monthly", nextDueDate = detail.ifBlank { "2026-08-01" }))
            showAdd = false
        }
    }
}

@Composable
private fun RemindersScreen(
    reminders: List<ReminderEntity>,
    onAdd: (ReminderEntity) -> Unit,
    onToggle: (ReminderEntity) -> Unit,
    onDelete: (ReminderEntity) -> Unit
) {
    var showAdd by remember { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Reminders") }
        item {
            Row(Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column { Text("Upcoming", fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, color = Ink); Text("${reminders.count { !it.completed }} reminders pending", color = Muted) }
                FloatingActionButton(onClick = { showAdd = true }, containerColor = Blue, contentColor = Color.White, modifier = Modifier.size(50.dp)) { Icon(Icons.Default.Add, null) }
            }
        }
        items(reminders, key = { it.id }) { item ->
            Card(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = item.completed, onCheckedChange = { onToggle(item) })
                    Column(Modifier.weight(1f)) {
                        Text(item.title, fontWeight = FontWeight.Bold, color = if (item.completed) Muted else Ink)
                        Text("${item.date} • ${item.time}", fontSize = 11.sp, color = Muted)
                    }
                    IconButton(onClick = { onDelete(item) }) { Icon(Icons.Default.DeleteOutline, "Delete", tint = Red) }
                }
            }
        }
    }
    if (showAdd) {
        AddItemDialog(title = "Add Reminder", amountEnabled = false, onDismiss = { showAdd = false }) { name, detail, _ ->
            onAdd(ReminderEntity(title = name, date = detail.ifBlank { "2026-07-29" }, time = "09:00 AM"))
            showAdd = false
        }
    }
}

@Composable
private fun NotesScreen(
    notes: List<NoteEntity>,
    onAdd: (NoteEntity) -> Unit,
    onPin: (NoteEntity) -> Unit,
    onDelete: (NoteEntity) -> Unit
) {
    var showAdd by remember { mutableStateOf(false) }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Notes") }
        item {
            Row(Modifier.padding(16.dp).fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField("", {}, readOnly = true, leadingIcon = { Icon(Icons.Default.Search, null) }, placeholder = { Text("Search notes") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(16.dp))
                Spacer(Modifier.width(10.dp))
                FloatingActionButton(onClick = { showAdd = true }, containerColor = Blue, contentColor = Color.White, modifier = Modifier.size(50.dp)) { Icon(Icons.Default.Add, null) }
            }
        }
        items(notes, key = { it.id }) { item ->
            Card(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = if (item.pinned) Color(0xFFFFF8E8) else Color.White)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Text(item.title, Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, color = Ink)
                        IconButton(onClick = { onPin(item) }) { Icon(Icons.Default.PushPin, "Pin", tint = if (item.pinned) Orange else Muted) }
                        IconButton(onClick = { onDelete(item) }) { Icon(Icons.Default.DeleteOutline, "Delete", tint = Red) }
                    }
                    Text(item.body, color = Muted)
                    Spacer(Modifier.height(8.dp))
                    Text(item.createdAt, fontSize = 10.sp, color = Muted)
                }
            }
        }
    }
    if (showAdd) {
        AddItemDialog(title = "Add Note", amountEnabled = false, onDismiss = { showAdd = false }) { name, detail, _ ->
            onAdd(NoteEntity(title = name, body = detail, createdAt = "Jul 28, 2026"))
            showAdd = false
        }
    }
}

@Composable
private fun AddItemDialog(
    title: String,
    amountEnabled: Boolean,
    onDismiss: () -> Unit,
    onSave: (String, String, Int) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var detail by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.ExtraBold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Title") }, shape = RoundedCornerShape(14.dp))
                OutlinedTextField(detail, { detail = it }, label = { Text(if (title.contains("Note")) "Details" else "Date") }, shape = RoundedCornerShape(14.dp))
                if (amountEnabled) OutlinedTextField(amount, { amount = it.filter(Char::isDigit) }, label = { Text("Amount") }, shape = RoundedCornerShape(14.dp))
            }
        },
        confirmButton = { Button(onClick = { if (name.isNotBlank()) onSave(name, detail, amount.toIntOrNull() ?: 0) }) { Text("Save") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun ProfileScreen(onNavigate: (Screen) -> Unit) {
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Settings & Profile") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(Modifier.size(70.dp), CircleShape, color = Color(0xFFFFE4E8)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Person, null, tint = Red, modifier = Modifier.size(42.dp)) } }
                        Spacer(Modifier.width(14.dp))
                        Column { Text("Mirza Galib Palash", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Ink); Text("galib@example.com", color = Muted, fontSize = 12.sp) }
                    }
                }
                Text("Preferences", fontWeight = FontWeight.Bold, color = Ink)
                Text("Tools", fontWeight = FontWeight.Bold, color = Ink)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ToolShortcut("Recurring", Icons.Default.Repeat, Green, Modifier.weight(1f)) { onNavigate(Screen.Recurring) }
                    ToolShortcut("Reminders", Icons.Default.Alarm, Orange, Modifier.weight(1f)) { onNavigate(Screen.Reminders) }
                    ToolShortcut("Notes", Icons.Default.NoteAlt, Color(0xFF7C3AED), Modifier.weight(1f)) { onNavigate(Screen.Notes) }
                }
                AppCard {
                    SettingsRow(Icons.Default.CurrencyExchange, "Currency", "Bangladeshi Taka (BDT)")
                    SettingsRow(Icons.Default.Language, "Language", "English / বাংলা")
                    SettingsRow(Icons.Default.Notifications, "Notifications", "Manage alerts and reminders")
                    SettingsRow(Icons.Default.Fingerprint, "Biometric Lock", "Use fingerprint to unlock")
                    SettingsRow(Icons.Default.DarkMode, "Appearance", "Light mode")
                }
                Text("Data & Privacy", fontWeight = FontWeight.Bold, color = Ink)
                AppCard {
                    SettingsRow(Icons.Default.Storage, "Data Management", "Export, clear or manage data")
                    SettingsRow(Icons.Default.PrivacyTip, "Privacy Policy", "Read our privacy policy")
                    SettingsRow(Icons.Default.Help, "Help & Support", "Get help and contact support")
                }
            }
        }
    }
}

@Composable
private fun ToolShortcut(label: String, icon: ImageVector, color: Color, modifier: Modifier, onClick: () -> Unit) {
    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White)
    ) {
        Column(Modifier.fillMaxWidth().padding(vertical = 16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(icon, null, tint = color)
            Spacer(Modifier.height(7.dp))
            Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Ink)
        }
    }
}

@Composable
private fun SettingsRow(icon: ImageVector, title: String, subtitle: String) {
    Row(Modifier.fillMaxWidth().padding(vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
        Surface(Modifier.size(38.dp), RoundedCornerShape(11.dp), color = Blue.copy(.1f)) { Box(contentAlignment = Alignment.Center) { Icon(icon, null, tint = Blue, modifier = Modifier.size(20.dp)) } }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.Bold, color = Ink); Text(subtitle, fontSize = 11.sp, color = Muted) }
        Icon(Icons.Default.ChevronRight, null, tint = Muted)
    }
}

@Composable
private fun BottomNavigation(selected: Screen, onSelect: (Screen) -> Unit) {
    NavigationBar(containerColor = Color.White, tonalElevation = 8.dp) {
        listOf(
            Triple(Screen.Home, "Home", Icons.Default.Home),
            Triple(Screen.Reports, "Reports", Icons.Default.BarChart),
            Triple(Screen.Add, "Add", Icons.Default.AddCircle),
            Triple(Screen.Calendar, "Calendar", Icons.Default.CalendarMonth),
            Triple(Screen.Profile, "Profile", Icons.Default.Person)
        ).forEach { (screen, label, icon) ->
            NavigationBarItem(
                selected = selected == screen,
                onClick = { onSelect(screen) },
                icon = { Icon(icon, label) },
                label = { Text(label, fontSize = 10.sp) },
                colors = NavigationBarItemDefaults.colors(selectedIconColor = Blue, selectedTextColor = Blue, indicatorColor = Blue.copy(.1f))
            )
        }
    }
}

@Composable
private fun AppCard(content: @Composable ColumnScope.() -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(3.dp)
    ) { Column(Modifier.padding(18.dp), content = content) }
}

@Composable
private fun SectionTitle(title: String, action: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(title, fontWeight = FontWeight.ExtraBold, color = Ink)
        Text(action, color = Blue, fontSize = 12.sp, fontWeight = FontWeight.Bold)
    }
}
