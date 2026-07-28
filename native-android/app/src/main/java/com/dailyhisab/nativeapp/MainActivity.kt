package com.dailyhisab.nativeapp

import android.Manifest
import android.content.Intent
import android.app.DatePickerDialog
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Bundle
import android.os.Build
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalContext
import com.dailyhisab.nativeapp.data.FinanceDatabase
import com.dailyhisab.nativeapp.data.CategoryEntity
import com.dailyhisab.nativeapp.data.NoteEntity
import com.dailyhisab.nativeapp.data.RecurringEntity
import com.dailyhisab.nativeapp.data.ReminderEntity
import com.dailyhisab.nativeapp.data.ReceiptEntity
import com.dailyhisab.nativeapp.data.TransactionEntity
import com.dailyhisab.nativeapp.notifications.ReminderWorker
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.temporal.WeekFields
import java.util.Locale

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
enum class Screen { Home, Reports, Analytics, Add, Entries, Categories, Budget, Calendar, Profile, Recurring, Reminders, Notes, Receipts, Settings, Backup }

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerForActivityResult(ActivityResultContracts.RequestPermission()) {}.launch(Manifest.permission.POST_NOTIFICATIONS)
        }
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
    val receiptDao = remember { FinanceDatabase.get(context).receiptDao() }
    val receipts by receiptDao.observeAll().collectAsState(initial = emptyList())
    val categoryDao = remember { FinanceDatabase.get(context).categoryDao() }
    val categories by categoryDao.observeAll().collectAsState(initial = emptyList())
    val prefs = remember { context.getSharedPreferences("daily_hisab_settings", 0) }
    var darkMode by remember { mutableStateOf(prefs.getBoolean("dark_mode", false)) }
    var profileName by remember { mutableStateOf(prefs.getString("profile_name", "Mirza Galib Palash") ?: "Mirza Galib Palash") }
    var profilePhoto by remember { mutableStateOf(prefs.getString("profile_photo", "") ?: "") }
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
    LaunchedEffect(categories) {
        if (categories.isEmpty()) {
            listOf("Food" to "food", "Transport" to "transport", "Shopping" to "shopping", "Utilities" to "bills", "Health" to "health", "Education" to "education", "Home" to "home", "Others" to "other")
                .forEach { (name, icon) -> categoryDao.insert(CategoryEntity(name = name, iconName = icon)) }
        }
    }

    MaterialTheme(
        colorScheme = if (darkMode) darkColorScheme(primary = Color(0xFF9DB2FF), secondary = Orange) else lightColorScheme(primary = Blue, secondary = Orange, surface = Color.White, background = Soft),
        typography = Typography()
    ) {
        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = { BottomNavigation(screen) { screen = it } }
        ) { padding ->
            Box(Modifier.padding(padding).fillMaxSize()) {
                when (screen) {
                    Screen.Home -> HomeScreen(expenses, onNavigate = { screen = it })
                    Screen.Reports -> ReportsScreen(expenses) { screen = Screen.Analytics }
                    Screen.Analytics -> AnalyticsScreen(expenses)
                    Screen.Add -> AddExpenseScreen(categories, { scope.launch { categoryDao.insert(it) } }) { expense, receiptUri ->
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
                            if (receiptUri != null) receiptDao.insert(ReceiptEntity(uri = receiptUri, title = expense.title.ifBlank { expense.category }, amount = expense.amount, createdAt = expense.date))
                            screen = Screen.Home
                        }
                    }
                    Screen.Entries -> EntriesScreen(expenses) { item -> scope.launch { dao.delete(storedTransactions.first { it.id == item.id }) } }
                    Screen.Categories -> CategoriesScreenV2(categories, expenses, { scope.launch { categoryDao.insert(it) } }, { scope.launch { categoryDao.delete(it) } })
                    Screen.Budget -> BudgetScreen(expenses)
                    Screen.Calendar -> CalendarV2(expenses)
                    Screen.Profile -> ProfileScreen(profileName, profilePhoto, onNameChange = {
                        profileName = it; prefs.edit().putString("profile_name", it).apply()
                    }, onPhotoChange = {
                        profilePhoto = it; prefs.edit().putString("profile_photo", it).apply()
                    }, onNavigate = { screen = it })
                    Screen.Recurring -> RecurringScreen(
                        recurringItems,
                        onAdd = { scope.launch { recurringDao.insert(it) } },
                        onDelete = { scope.launch { recurringDao.delete(it) } }
                    )
                    Screen.Reminders -> RemindersScreen(
                        reminders,
                        onAdd = {
                            scope.launch { reminderDao.insert(it) }
                            ReminderWorker.schedule(context, it.title, it.date, it.time)
                        },
                        onToggle = { item -> scope.launch { reminderDao.setCompleted(item.id, !item.completed) } },
                        onDelete = { scope.launch { reminderDao.delete(it) } }
                    )
                    Screen.Notes -> NotesScreen(
                        notes,
                        onAdd = { scope.launch { noteDao.insert(it) } },
                        onPin = { item -> scope.launch { noteDao.setPinned(item.id, !item.pinned) } },
                        onDelete = { scope.launch { noteDao.delete(it) } }
                    )
                    Screen.Receipts -> ReceiptsScreen(
                        receipts,
                        onAdd = { scope.launch { receiptDao.insert(it) } },
                        onDelete = { scope.launch { receiptDao.delete(it) } }
                    )
                    Screen.Settings -> SettingsScreen(darkMode) {
                        darkMode = it; prefs.edit().putBoolean("dark_mode", it).apply()
                    }
                    Screen.Backup -> BackupScreen(expenses, recurringItems, reminders, notes)
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
    val today = LocalDate.now()
    val currentMonth = YearMonth.from(today)
    val monthEntries = expenses.filter { item ->
        runCatching { YearMonth.from(LocalDate.parse(item.date)) == currentMonth }.getOrDefault(false)
    }
    val todaySpent = expenses.filter { !it.income && it.date == today.toString() }.sumOf { it.amount }
    val monthSpent = monthEntries.filterNot { it.income }.sumOf { it.amount }
    val monthIncome = monthEntries.filter { it.income }.sumOf { it.amount }
    val allSpent = expenses.filterNot { it.income }.sumOf { it.amount }
    val dailyAverage = monthSpent / today.dayOfMonth.coerceAtLeast(1)
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { AppHeader(subtitle = "Your Daily Expense Tracker") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                HomeHeroPager(todaySpent, monthSpent, allSpent, dailyAverage, monthIncome)
                Text("Quick Add", fontWeight = FontWeight.Bold, color = Ink)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    QuickAction("Expense", Icons.Default.ShoppingBag, Red) { onNavigate(Screen.Add) }
                    QuickAction("Income", Icons.Default.Payments, Green) { onNavigate(Screen.Add) }
                    QuickAction("Categories", Icons.Default.GridView, Color(0xFF7C3AED)) { onNavigate(Screen.Categories) }
                    QuickAction("Budget", Icons.Default.AccountBalance, Muted) { onNavigate(Screen.Budget) }
                }
                MonthOverviewLive(monthEntries)
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
private fun HomeHeroPager(todaySpent: Int, monthSpent: Int, allSpent: Int, dailyAverage: Int, monthIncome: Int) {
    val pagerState = rememberPagerState(initialPage = 0, pageCount = { 2 })
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        HorizontalPager(state = pagerState, modifier = Modifier.fillMaxWidth().height(190.dp), pageSpacing = 12.dp) { page ->
            if (page == 0) TodayExpenseHero(todaySpent, monthSpent, allSpent, dailyAverage)
            else BalanceHeroLive(monthIncome, monthSpent)
        }
        Spacer(Modifier.height(9.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            repeat(2) { page ->
                Box(Modifier.width(if (pagerState.currentPage == page) 22.dp else 7.dp).height(7.dp).background(if (pagerState.currentPage == page) Blue else Muted.copy(.3f), CircleShape))
            }
        }
    }
}

@Composable
private fun TodayExpenseHero(todaySpent: Int, monthSpent: Int, allSpent: Int, dailyAverage: Int) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(8.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        Column(
            Modifier.fillMaxSize().background(Brush.linearGradient(listOf(Color(0xFF4C1D95), Color(0xFF7C3AED), Color(0xFF9333EA)))).padding(20.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text("TODAY'S EXPENSE", color = Color.White.copy(.72f), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Text("৳ $todaySpent", color = Color.White, fontSize = 38.sp, fontWeight = FontWeight.ExtraBold)
            }
            HorizontalDivider(color = Color.White.copy(.18f))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                HeroMetric("This Month", "৳ $monthSpent", Color.White)
                HeroMetric("All Expense", "৳ $allSpent", Color.White)
                HeroMetric("Daily Average", "৳ $dailyAverage", Color(0xFFFFD166))
            }
        }
    }
}

@Composable
private fun BalanceHeroLive(income: Int, spent: Int) {
    Card(
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(8.dp),
        modifier = Modifier.fillMaxSize()
    ) {
        Column(
            Modifier.fillMaxSize().background(Brush.linearGradient(listOf(Navy, Blue, Color(0xFF1949C6)))).padding(20.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${YearMonth.now().format(DateTimeFormatter.ofPattern("MMMM yyyy"))} • Monthly Summary", color = Color.White.copy(.78f), fontSize = 12.sp)
                Text("Wallet Balance", color = Color.White.copy(.78f), fontSize = 12.sp)
            }
            Text("৳ ${income - spent}", color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
            HorizontalDivider(color = Color.White.copy(.16f))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                HeroMetric("Income", "৳ $income", Green)
                HeroMetric("Expense", "৳ $spent", Color(0xFFFF7A7A))
                HeroMetric("Savings", "৳ ${income - spent}", Color.White)
            }
        }
    }
}

@Composable
private fun BalanceHero(income: Int, spent: Int) {
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
private fun MonthOverviewLive(entries: List<Expense>) {
    val spent = entries.filterNot { it.income }.sumOf { it.amount }
    val categories = entries.filterNot { it.income }.groupBy { it.category }
        .mapValues { (_, items) -> items.sumOf { it.amount } }
        .toList().sortedByDescending { it.second }.take(4)
    val colors = listOf(Orange, Color(0xFF8B5CF6), Green, Red)
    AppCard {
        SectionTitle("This Month Overview", YearMonth.now().format(DateTimeFormatter.ofPattern("MMMM yyyy")))
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(116.dp).background(Brush.sweepGradient(colors + Orange), CircleShape), contentAlignment = Alignment.Center) {
                Surface(Modifier.size(78.dp), CircleShape, color = Color.White) {
                    Box(contentAlignment = Alignment.Center) { Text("৳ $spent\nTotal", fontWeight = FontWeight.Bold, color = Ink) }
                }
            }
            Spacer(Modifier.width(18.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (categories.isEmpty()) Text("No expenses this month", color = Muted, fontSize = 12.sp)
                categories.forEachIndexed { index, (name, amount) -> Legend(name, "৳ $amount", colors[index]) }
            }
        }
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
private fun ReportsScreen(expenses: List<Expense>, onAnalytics: () -> Unit) {
    val context = LocalContext.current
    var period by remember { mutableStateOf("Monthly") }
    val visible = remember(expenses, period) { expensesForPeriod(expenses, period, LocalDate.now()) }
    val createPdf = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri ->
        if (uri != null) exportPdf(context, uri, visible, period)
    }
    val createCsv = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        if (uri != null) context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { writer ->
            writer.write("Date,Time,Title,Category,Type,Amount,Note\n")
            visible.forEach { writer.write(listOf(it.date, it.time, it.title, it.category, if (it.income) "Income" else "Expense", it.amount, it.note).joinToString(",") { value -> "\"${value.toString().replace("\"", "\"\"")}\"" } + "\n") }
        }
    }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Reports") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("Download detailed financial reports", color = Muted)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("Daily", "Weekly", "Monthly", "Yearly").forEach {
                        FilterChip(period == it, { period = it }, { Text(it, fontSize = 11.sp) })
                    }
                }
                AppCard {
                    Text("$period Summary", fontWeight = FontWeight.ExtraBold, color = Ink)
                    Spacer(Modifier.height(12.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        SummaryMetric("Income", visible.filter { it.income }.sumOf { it.amount }, Green)
                        SummaryMetric("Expense", visible.filterNot { it.income }.sumOf { it.amount }, Red)
                        SummaryMetric("Entries", visible.size, Blue)
                    }
                }
                Button(onClick = { createPdf.launch("daily-hisab-${period.lowercase()}.pdf") }, Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.PictureAsPdf, null); Spacer(Modifier.width(8.dp)); Text("Export PDF")
                }
                OutlinedButton(onClick = { createCsv.launch("daily-hisab-${period.lowercase()}.csv") }, Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.TableView, null); Spacer(Modifier.width(8.dp)); Text("Export Excel (CSV)")
                }
                OutlinedButton(onClick = onAnalytics, Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.Analytics, null); Spacer(Modifier.width(8.dp)); Text("Open Analytics")
                }
                SectionTitle("Report entries", "${visible.size}")
            }
        }
        items(visible) { TransactionRow(it) }
    }
}

private fun expensesForPeriod(expenses: List<Expense>, period: String, anchor: LocalDate): List<Expense> {
    val weekFields = WeekFields.ISO
    return expenses.filter { item ->
        val date = runCatching { LocalDate.parse(item.date) }.getOrNull() ?: return@filter false
        when (period) {
            "Daily" -> date == anchor
            "Weekly" ->
                date.get(weekFields.weekBasedYear()) == anchor.get(weekFields.weekBasedYear()) &&
                    date.get(weekFields.weekOfWeekBasedYear()) == anchor.get(weekFields.weekOfWeekBasedYear())
            "Yearly" -> date.year == anchor.year
            else -> YearMonth.from(date) == YearMonth.from(anchor)
        }
    }.sortedWith(compareByDescending<Expense> { it.date }.thenByDescending { it.id })
}

private fun exportPdf(context: android.content.Context, uri: Uri, expenses: List<Expense>, period: String) {
    val document = PdfDocument()
    val paint = Paint().apply { color = android.graphics.Color.BLACK; textSize = 13f }
    var pageNumber = 1
    var page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, pageNumber).create())
    var y = 48f
    fun line(text: String) {
        if (y > 800f) {
            document.finishPage(page); pageNumber++
            page = document.startPage(PdfDocument.PageInfo.Builder(595, 842, pageNumber).create()); y = 48f
        }
        page.canvas.drawText(text.take(90), 36f, y, paint); y += 24f
    }
    paint.textSize = 20f; line("Daily Hisab - $period Report"); paint.textSize = 13f
    line("Income: ${expenses.filter { it.income }.sumOf { it.amount }}   Expense: ${expenses.filterNot { it.income }.sumOf { it.amount }}")
    expenses.forEach { line("${it.date} | ${it.title} | ${it.category} | ${if (it.income) "+" else "-"} BDT ${it.amount}") }
    document.finishPage(page)
    context.contentResolver.openOutputStream(uri)?.use { document.writeTo(it) }
    document.close()
}

@Composable
private fun AnalyticsScreen(expenses: List<Expense>) {
    var period by remember { mutableStateOf("Monthly") }
    val visible = remember(expenses, period) { expensesForPeriod(expenses, period, LocalDate.now()) }
    val income = visible.filter { it.income }.sumOf { it.amount }
    val spent = visible.filterNot { it.income }.sumOf { it.amount }
    val grouped = visible.filterNot { it.income }.groupBy { it.category }
        .mapValues { (_, items) -> items.sumOf { it.amount } }
        .toList().sortedByDescending { it.second }.take(5)
    val largest = grouped.maxOfOrNull { it.second }?.coerceAtLeast(1) ?: 1
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Analytics") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("Daily", "Weekly", "Monthly", "Yearly").forEach {
                        FilterChip(period == it, { period = it }, { Text(it, fontSize = 11.sp) })
                    }
                }
                AppCard {
                    Text("$period Overview", fontWeight = FontWeight.ExtraBold, color = Ink)
                    Spacer(Modifier.height(14.dp))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        SummaryMetric("Income", income, Green)
                        SummaryMetric("Expense", spent, Red)
                        SummaryMetric("Balance", income - spent, Blue)
                    }
                }
                AppCard {
                    Text("Expense by category", fontWeight = FontWeight.Bold, color = Ink)
                    Spacer(Modifier.height(16.dp))
                    if (grouped.isEmpty()) Text("No expense data for this $period period", color = Muted)
                    grouped.forEachIndexed { index, (category, amount) ->
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                            Text(category, Modifier.width(92.dp), fontSize = 12.sp, color = Muted)
                            Box(Modifier.weight(1f).height(12.dp).background(Soft, RoundedCornerShape(8.dp))) {
                                Box(Modifier.fillMaxWidth(amount.toFloat() / largest).fillMaxHeight().background(listOf(Orange, Blue, Green, Red, Color(0xFF8B5CF6))[index], RoundedCornerShape(8.dp)))
                            }
                            Text("৳ $amount", Modifier.width(72.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(10.dp))
                    }
                }
                SectionTitle("$period entries", "${visible.size}")
            }
        }
        if (visible.isEmpty()) item { Text("No entries found for the selected period", Modifier.padding(horizontal = 24.dp, vertical = 12.dp), color = Muted) }
        items(visible, key = { it.id }) { TransactionRow(it) }
    }
}

@Composable
private fun AddExpenseScreen(categories: List<CategoryEntity>, onAddCategory: (CategoryEntity) -> Unit, onSave: (Expense, String?) -> Unit) {
    val context = LocalContext.current
    var amount by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(categories.firstOrNull()?.name ?: "Food") }
    var title by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var isIncome by remember { mutableStateOf(false) }
    var date by remember { mutableStateOf(LocalDate.now()) }
    var receiptUri by remember { mutableStateOf<String?>(null) }
    var showCategoryDialog by remember { mutableStateOf(false) }
    val receiptPicker = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            receiptUri = uri.toString()
        }
    }
    if (showCategoryDialog) CategoryDialog({ showCategoryDialog = false }) {
        onAddCategory(it); category = it.name; showCategoryDialog = false
    }
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
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
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text("Category", Modifier.weight(1f), fontWeight = FontWeight.Bold, color = Ink)
                    IconButton(onClick = { showCategoryDialog = true }) { Icon(Icons.Default.AddCircle, "Add new category", tint = Blue) }
                }
                Spacer(Modifier.height(10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    categories.chunked(3).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            row.forEach { item ->
                                FilterChip(category == item.name, { category = item.name }, { Text(item.name, fontSize = 11.sp) }, leadingIcon = { Icon(categoryIcon(item.iconName), null, Modifier.size(16.dp)) })
                            }
                        }
                    }
                }
            }
            item {
                OutlinedButton(onClick = {
                    DatePickerDialog(context, { _, year, month, day -> date = LocalDate.of(year, month + 1, day) }, date.year, date.monthValue - 1, date.dayOfMonth).show()
                }, Modifier.fillMaxWidth().height(56.dp), shape = RoundedCornerShape(16.dp)) {
                    Icon(Icons.Default.CalendarMonth, null); Spacer(Modifier.width(10.dp)); Text(date.format(DateTimeFormatter.ofPattern("dd MMM yyyy")))
                }
            }
            item { OutlinedTextField(note, { note = it }, label = { Text("Note (Optional)") }, modifier = Modifier.fillMaxWidth().height(110.dp), shape = RoundedCornerShape(16.dp)) }
            item {
                OutlinedButton(onClick = { receiptPicker.launch(androidx.activity.result.PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }, modifier = Modifier.fillMaxWidth().height(62.dp), shape = RoundedCornerShape(16.dp)) {
                    Icon(if (receiptUri == null) Icons.Default.UploadFile else Icons.Default.CheckCircle, null); Spacer(Modifier.width(8.dp)); Text(if (receiptUri == null) "Upload Receipt" else "Receipt selected")
                }
            }
            if (receiptUri != null) item { ReceiptThumbnail(receiptUri!!) }
        }
        Button(
            onClick = {
                if (amount.isNotBlank()) onSave(
                    Expense(
                        title = title.ifBlank { category },
                        category = if (isIncome && category == "Food") "Income" else category,
                        amount = amount.toInt(),
                        date = date.toString(),
                        time = "Just now",
                        income = isIncome,
                        note = note
                    ), receiptUri
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
private fun CalendarV2(expenses: List<Expense>) {
    var selected by remember { mutableStateOf(LocalDate.now()) }
    var month by remember { mutableStateOf(YearMonth.now()) }
    val offset = month.atDay(1).dayOfWeek.value % 7
    val cells: List<LocalDate?> = List(offset) { null } + (1..month.lengthOfMonth()).map { month.atDay(it) }
    val visible = expenses.filter { it.date == selected.toString() }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Calendar") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { month = month.minusMonths(1) }) { Icon(Icons.Default.ChevronLeft, null) }
                        Text(month.format(DateTimeFormatter.ofPattern("MMMM yyyy")), Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold, color = Ink)
                        IconButton(onClick = { month = month.plusMonths(1) }) { Icon(Icons.Default.ChevronRight, null) }
                    }
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        listOf("S","M","T","W","T","F","S").forEach { Text(it, Modifier.width(38.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = Muted) }
                    }
                    cells.chunked(7).forEach { week ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            week.forEach { day ->
                                Surface(shape = CircleShape, color = if (day == selected) Blue else Color.Transparent, modifier = Modifier.size(38.dp).clickable(enabled = day != null) { selected = day!! }) {
                                    Box(contentAlignment = Alignment.Center) { Text(day?.dayOfMonth?.toString() ?: "", color = if (day == selected) Color.White else Ink) }
                                }
                            }
                            repeat(7 - week.size) { Spacer(Modifier.size(38.dp)) }
                        }
                    }
                }
                SectionTitle(selected.format(DateTimeFormatter.ofPattern("EEEE, dd MMMM")), "BDT ${visible.filterNot { it.income }.sumOf { it.amount }}")
            }
        }
        if (visible.isEmpty()) item { Text("No entries for this date", Modifier.padding(24.dp), color = Muted) }
        items(visible) { TransactionRow(it) }
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

private fun categoryIcon(name: String): ImageVector = when (name) {
    "food" -> Icons.Default.Restaurant
    "transport" -> Icons.Default.DirectionsBus
    "shopping" -> Icons.Default.ShoppingBag
    "bills" -> Icons.Default.Bolt
    "health" -> Icons.Default.Favorite
    "education" -> Icons.Default.School
    "home" -> Icons.Default.Home
    else -> Icons.Default.MoreHoriz
}

@Composable
private fun CategoryDialog(onDismiss: () -> Unit, onAdd: (CategoryEntity) -> Unit) {
    var name by remember { mutableStateOf("") }
    var icon by remember { mutableStateOf("food") }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add category") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Category name") })
                Text("Choose an icon")
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("food", "transport", "shopping", "bills").forEach { value ->
                        FilterChip(icon == value, { icon = value }, { Icon(categoryIcon(value), value) })
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("health", "education", "home", "other").forEach { value ->
                        FilterChip(icon == value, { icon = value }, { Icon(categoryIcon(value), value) })
                    }
                }
            }
        },
        confirmButton = { Button(onClick = { if (name.isNotBlank()) onAdd(CategoryEntity(name = name.trim(), iconName = icon)) }, enabled = name.isNotBlank()) { Text("Add") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun CategoriesScreenV2(categories: List<CategoryEntity>, expenses: List<Expense>, onAdd: (CategoryEntity) -> Unit, onDelete: (CategoryEntity) -> Unit) {
    var showDialog by remember { mutableStateOf(false) }
    if (showDialog) CategoryDialog({ showDialog = false }) { onAdd(it); showDialog = false }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Categories") }
        items(categories.chunked(2)) { row ->
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { item ->
                    Card(Modifier.weight(1f), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                        Column(Modifier.fillMaxWidth().padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(categoryIcon(item.iconName), null, tint = Blue, modifier = Modifier.size(34.dp))
                            Text(item.name, fontWeight = FontWeight.Bold)
                            Text("BDT ${expenses.filter { !it.income && it.category == item.name }.sumOf { it.amount }}", color = Muted, fontSize = 11.sp)
                            IconButton(onClick = { onDelete(item) }) { Icon(Icons.Default.DeleteOutline, "Delete category", tint = Red) }
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        item { Button(onClick = { showDialog = true }, Modifier.padding(16.dp).fillMaxWidth()) { Icon(Icons.Default.Add, null); Text("Add Category") } }
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
private fun ReceiptsScreen(receipts: List<ReceiptEntity>, onAdd: (ReceiptEntity) -> Unit, onDelete: (ReceiptEntity) -> Unit) {
    val context = LocalContext.current
    val picker = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            onAdd(ReceiptEntity(uri = uri.toString(), title = "Receipt ${receipts.size + 1}", createdAt = "Jul 28, 2026"))
        }
    }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Receipts") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(Modifier.size(62.dp), RoundedCornerShape(18.dp), color = Blue.copy(.1f)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.DocumentScanner, null, tint = Blue, modifier = Modifier.size(30.dp)) }
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Save your receipts", fontWeight = FontWeight.ExtraBold, color = Ink)
                            Text("Select an image from your device", color = Muted, fontSize = 11.sp)
                        }
                    }
                    Spacer(Modifier.height(14.dp))
                    Button(
                        onClick = { picker.launch(androidx.activity.result.PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                        modifier = Modifier.fillMaxWidth()
                    ) { Icon(Icons.Default.AddPhotoAlternate, null); Text("Choose Receipt Image") }
                }
                SectionTitle("Receipt Gallery", "${receipts.size} saved")
            }
        }
        items(receipts, key = { it.id }) { receipt ->
            Card(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth(),
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    ReceiptThumbnail(receipt.uri)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(receipt.title, fontWeight = FontWeight.Bold, color = Ink)
                        Text(receipt.createdAt, color = Muted, fontSize = 11.sp)
                    }
                    IconButton(onClick = { onDelete(receipt) }) { Icon(Icons.Default.DeleteOutline, "Delete", tint = Red) }
                }
            }
        }
    }
}

@Composable
private fun ReceiptThumbnail(uriString: String) {
    val context = LocalContext.current
    val bitmap by produceState<android.graphics.Bitmap?>(initialValue = null, uriString) {
        value = runCatching {
            val uri = Uri.parse(uriString)
            if (Build.VERSION.SDK_INT >= 28) {
                ImageDecoder.decodeBitmap(ImageDecoder.createSource(context.contentResolver, uri))
            } else {
                context.contentResolver.openInputStream(uri).use(BitmapFactory::decodeStream)
            }
        }.getOrNull()
    }
    Surface(Modifier.size(64.dp), RoundedCornerShape(14.dp), color = Soft) {
        if (bitmap != null) {
            androidx.compose.foundation.Image(bitmap!!.asImageBitmap(), null, modifier = Modifier.fillMaxSize(), contentScale = androidx.compose.ui.layout.ContentScale.Crop)
        } else {
            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.ReceiptLong, null, tint = Muted) }
        }
    }
}

@Composable
private fun SettingsScreen(darkMode: Boolean, onDarkModeChange: (Boolean) -> Unit) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("daily_hisab_settings", 0) }
    var currency by remember { mutableStateOf(prefs.getString("currency", "BDT") ?: "BDT") }
    var language by remember { mutableStateOf(prefs.getString("language", "English") ?: "English") }
    var notifications by remember { mutableStateOf(prefs.getBoolean("notifications", true)) }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Settings") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text("Currency", fontWeight = FontWeight.Bold, color = Ink)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf("BDT", "USD").forEachIndexed { index, value ->
                        SegmentedButton(selected = currency == value, onClick = { currency = value; prefs.edit().putString("currency", value).apply() }, shape = SegmentedButtonDefaults.itemShape(index, 2)) { Text(value) }
                    }
                }
                Text("Language", fontWeight = FontWeight.Bold, color = Ink)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf("English", "বাংলা").forEachIndexed { index, value ->
                        SegmentedButton(selected = language == value, onClick = { language = value; prefs.edit().putString("language", value).apply() }, shape = SegmentedButtonDefaults.itemShape(index, 2)) { Text(value) }
                    }
                }
                AppCard {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Notifications, null, tint = Orange)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) { Text("Notifications", fontWeight = FontWeight.Bold, color = Ink); Text("Expense and payment reminders", fontSize = 11.sp, color = Muted) }
                        Switch(checked = notifications, onCheckedChange = { notifications = it; prefs.edit().putBoolean("notifications", it).apply() })
                    }
                }
                AppCard {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (darkMode) Icons.Default.DarkMode else Icons.Default.LightMode, null, tint = Blue)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) { Text("Dark mode", fontWeight = FontWeight.Bold); Text("Switch between light and dark appearance", fontSize = 11.sp, color = Muted) }
                        Switch(darkMode, onDarkModeChange)
                    }
                }
                Text("Settings are saved automatically on this device.", color = Muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun BackupScreen(
    expenses: List<Expense>,
    recurring: List<RecurringEntity>,
    reminders: List<ReminderEntity>,
    notes: List<NoteEntity>
) {
    val context = LocalContext.current
    var status by remember { mutableStateOf("Ready to create a backup") }
    val backupJson = remember(expenses, recurring, reminders, notes) {
        JSONObject().apply {
            put("version", 1)
            put("createdAt", System.currentTimeMillis())
            put("transactions", JSONArray().apply { expenses.forEach { put(JSONObject().put("title", it.title).put("category", it.category).put("amount", it.amount).put("date", it.date).put("time", it.time).put("income", it.income).put("note", it.note)) } })
            put("recurring", JSONArray().apply { recurring.forEach { put(JSONObject().put("title", it.title).put("amount", it.amount).put("frequency", it.frequency).put("nextDueDate", it.nextDueDate)) } })
            put("reminders", JSONArray().apply { reminders.forEach { put(JSONObject().put("title", it.title).put("date", it.date).put("time", it.time).put("completed", it.completed)) } })
            put("notes", JSONArray().apply { notes.forEach { put(JSONObject().put("title", it.title).put("body", it.body).put("createdAt", it.createdAt).put("pinned", it.pinned)) } })
        }.toString(2)
    }
    val createDocument = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) {
            runCatching { context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(backupJson) } }
                .onSuccess { status = "Backup saved successfully" }
                .onFailure { status = "Backup failed: ${it.message}" }
        }
    }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Backup & Restore") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Icon(Icons.Default.CloudDone, null, tint = Green, modifier = Modifier.size(52.dp))
                    Spacer(Modifier.height(10.dp))
                    Text("Your offline data is ready", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Ink)
                    Text(status, color = Muted)
                    Spacer(Modifier.height(16.dp))
                    Button(onClick = { createDocument.launch("daily-hisab-backup.json") }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.CloudUpload, null); Text("Export Backup")
                    }
                }
                AppCard {
                    Text("Backup includes", fontWeight = FontWeight.Bold, color = Ink)
                    Text("• ${expenses.size} transactions\n• ${recurring.size} recurring expenses\n• ${reminders.size} reminders\n• ${notes.size} notes", color = Muted, lineHeight = 24.sp)
                }
                Text("The JSON backup is saved to a location you choose and can be kept in Google Drive.", color = Muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun ProfileScreen(name: String, photo: String, onNameChange: (String) -> Unit, onPhotoChange: (String) -> Unit, onNavigate: (Screen) -> Unit) {
    val context = LocalContext.current
    var editName by remember { mutableStateOf(false) }
    var draft by remember(name) { mutableStateOf(name) }
    val picker = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            onPhotoChange(uri.toString())
        }
    }
    if (editName) AlertDialog(onDismissRequest = { editName = false }, title = { Text("Edit profile") }, text = { OutlinedTextField(draft, { draft = it }, label = { Text("Name") }) }, confirmButton = { Button(onClick = { onNameChange(draft.trim()); editName = false }) { Text("Save") } }, dismissButton = { TextButton(onClick = { editName = false }) { Text("Cancel") } })
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Settings & Profile") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.clickable { picker.launch(androidx.activity.result.PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }) {
                            if (photo.isNotBlank()) ReceiptThumbnail(photo) else Surface(Modifier.size(70.dp), CircleShape, color = Color(0xFFFFE4E8)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Person, null, tint = Red, modifier = Modifier.size(42.dp)) } }
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) { Text(name, fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Ink); Text("Tap photo to change", color = Muted, fontSize = 12.sp) }
                        IconButton(onClick = { editName = true }) { Icon(Icons.Default.Edit, "Edit profile") }
                    }
                }
                Text("Preferences", fontWeight = FontWeight.Bold, color = Ink)
                Text("Tools", fontWeight = FontWeight.Bold, color = Ink)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ToolShortcut("Recurring", Icons.Default.Repeat, Green, Modifier.weight(1f)) { onNavigate(Screen.Recurring) }
                    ToolShortcut("Reminders", Icons.Default.Alarm, Orange, Modifier.weight(1f)) { onNavigate(Screen.Reminders) }
                    ToolShortcut("Notes", Icons.Default.NoteAlt, Color(0xFF7C3AED), Modifier.weight(1f)) { onNavigate(Screen.Notes) }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    ToolShortcut("Receipts", Icons.Default.ReceiptLong, Red, Modifier.weight(1f)) { onNavigate(Screen.Receipts) }
                    ToolShortcut("Backup", Icons.Default.CloudUpload, Green, Modifier.weight(1f)) { onNavigate(Screen.Backup) }
                    ToolShortcut("Settings", Icons.Default.Settings, Blue, Modifier.weight(1f)) { onNavigate(Screen.Settings) }
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
