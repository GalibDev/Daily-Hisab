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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val Navy = Color(0xFF07194E)
private val Blue = Color(0xFF11298F)
private val Orange = Color(0xFFF97316)
private val Green = Color(0xFF16A34A)
private val Red = Color(0xFFEF4444)
private val Ink = Color(0xFF111936)
private val Muted = Color(0xFF69718A)
private val Soft = Color(0xFFF5F7FF)

data class Expense(val title: String, val category: String, val amount: Int, val time: String, val income: Boolean = false)
enum class Screen { Home, Reports, Add, Calendar, Profile }

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { DailyHisabApp() }
    }
}

@Composable
fun DailyHisabApp() {
    var screen by remember { mutableStateOf(Screen.Home) }
    var expenses by remember {
        mutableStateOf(
            listOf(
                Expense("Groceries", "Food", 120, "10:30 AM"),
                Expense("Transport (Ride)", "Transport", 100, "09:15 AM"),
                Expense("Salary", "Income", 2500, "Yesterday", true),
                Expense("Electricity Bill", "Utilities", 150, "Jul 10")
            )
        )
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
                    Screen.Home -> HomeScreen(expenses)
                    Screen.Reports -> ReportsScreen(expenses)
                    Screen.Add -> AddExpenseScreen { expense ->
                        expenses = listOf(expense) + expenses
                        screen = Screen.Home
                    }
                    Screen.Calendar -> CalendarScreen(expenses)
                    Screen.Profile -> ProfileScreen()
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
private fun HomeScreen(expenses: List<Expense>) {
    val spent = expenses.filterNot { it.income }.sumOf { it.amount }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { AppHeader(subtitle = "Your Daily Expense Tracker") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                BalanceHero(spent)
                Text("Quick Add", fontWeight = FontWeight.Bold, color = Ink)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    QuickAction("Expense", Icons.Default.ShoppingBag, Red)
                    QuickAction("Income", Icons.Default.Payments, Green)
                    QuickAction("Transfer", Icons.Default.SwapHoriz, Color(0xFF7C3AED))
                    QuickAction("More", Icons.Default.MoreHoriz, Muted)
                }
                MonthOverview(spent)
                SectionTitle("Recent Transactions", "See all")
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
private fun QuickAction(label: String, icon: ImageVector, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
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
    Column(Modifier.fillMaxSize().background(Color.White)) {
        AppHeader("Add Expense")
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                OutlinedTextField(
                    value = amount, onValueChange = { amount = it.filter(Char::isDigit) },
                    label = { Text("Amount") }, leadingIcon = { Text("৳", fontSize = 24.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)
                )
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
            item { OutlinedTextField("", {}, label = { Text("Note (Optional)") }, modifier = Modifier.fillMaxWidth().height(110.dp), shape = RoundedCornerShape(16.dp)) }
            item {
                OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth().height(62.dp), shape = RoundedCornerShape(16.dp)) {
                    Icon(Icons.Default.UploadFile, null); Spacer(Modifier.width(8.dp)); Text("Upload Receipt")
                }
            }
        }
        Button(
            onClick = { if (amount.isNotBlank()) onSave(Expense(category, category, amount.toInt(), "Just now")) },
            modifier = Modifier.padding(16.dp).fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp),
            enabled = amount.isNotBlank()
        ) { Text("Save Expense", fontWeight = FontWeight.Bold) }
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
private fun ProfileScreen() {
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
