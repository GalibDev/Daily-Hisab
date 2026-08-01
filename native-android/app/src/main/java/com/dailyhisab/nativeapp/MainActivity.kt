package com.dailyhisab.nativeapp

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.app.NotificationChannel
import android.app.NotificationManager
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Bundle
import android.os.Build
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.saveable.rememberSaveable
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
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.room.withTransaction
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.selection.SelectionContainer
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthUserCollisionException
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.UserProfileChangeRequest
import com.dailyhisab.nativeapp.data.FinanceDatabase
import com.dailyhisab.nativeapp.data.CategoryEntity
import com.dailyhisab.nativeapp.data.AppNotificationEntity
import com.dailyhisab.nativeapp.data.NoteEntity
import com.dailyhisab.nativeapp.data.RecurringEntity
import com.dailyhisab.nativeapp.data.ReminderEntity
import com.dailyhisab.nativeapp.data.ReceiptEntity
import com.dailyhisab.nativeapp.data.TransactionEntity
import com.dailyhisab.nativeapp.data.LoanEntity
import com.dailyhisab.nativeapp.data.LoanPaymentEntity
import com.dailyhisab.nativeapp.notifications.ReminderWorker
import com.dailyhisab.nativeapp.notifications.DailyInsightWorker
import com.dailyhisab.nativeapp.backup.AutomaticBackupWorker
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.time.LocalTime
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
private val NotePalette = listOf(
    Color(0xFFFFF3B8), Color(0xFFDDF4D0), Color(0xFFFFDCE5),
    Color(0xFFD8F3F0), Color(0xFFE5DEFF), Color(0xFFFFE6C9)
)
private var useBangla by mutableStateOf(false)
private var selectedCurrency by mutableStateOf("BDT")
private const val BDT_PER_USD = 120.0
private var biometricExternalActivityActive = false
private val LocalNotificationClick = staticCompositionLocalOf<() -> Unit> { {} }
private val LocalUnreadNotificationCount = staticCompositionLocalOf { 0 }

private fun money(amount: Int): String = when (selectedCurrency) {
    "USD" -> "$ ${String.format(Locale.US, "%.2f", amount / BDT_PER_USD)}"
    "USDT" -> "USDT ${String.format(Locale.US, "%.2f", amount / BDT_PER_USD)}"
    else -> "৳ $amount"
}

private fun translated(text: String): String {
    if (!useBangla) return text
    return mapOf(
        "Settings" to "সেটিংস",
        "Reports" to "রিপোর্ট",
        "Analytics" to "অ্যানালিটিক্স",
        "Add Expense" to "খরচ যোগ করুন",
        "All Expenses" to "সব খরচ",
        "Categories" to "ক্যাটাগরি",
        "Budget" to "বাজেট",
        "Calendar" to "ক্যালেন্ডার",
        "Profile" to "প্রোফাইল",
        "Settings & Profile" to "সেটিংস ও প্রোফাইল",
        "Recurring Expenses" to "নিয়মিত খরচ",
        "Reminders" to "রিমাইন্ডার",
        "Notes" to "নোট",
        "Receipts" to "রসিদ",
        "Backup & Restore" to "ব্যাকআপ ও রিস্টোর",
        "Your Daily Expense Tracker" to "আপনার দৈনিক খরচের হিসাব",
        "Home" to "হোম",
        "Add" to "যোগ করুন"
    )[text] ?: text
}

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

private fun Expense.toEntity() = TransactionEntity(
    id = id,
    title = title,
    category = category,
    amount = amount,
    date = date,
    time = time,
    type = if (income) "income" else "expense",
    note = note
)
enum class Screen { Home, Reports, Analytics, Add, Entries, Categories, CategoryDetails, Budget, Loans, Calendar, Profile, Recurring, Reminders, NotificationCenter, Notes, Receipts, Settings, Backup, Privacy, Help }

class MainActivity : FragmentActivity() {
    private val notificationPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        getSystemService(NotificationManager::class.java).apply {
            createNotificationChannel(NotificationChannel("daily_hisab_reminders_sound", "Reminders with sound", NotificationManager.IMPORTANCE_HIGH))
            createNotificationChannel(
                NotificationChannel("daily_hisab_reminders_silent", "Silent reminders", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    setSound(null, null)
                    enableVibration(false)
                }
            )
        }
        DailyInsightWorker.schedule(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        setContent { DailyHisabApp() }
    }
}

private const val BIOMETRIC_AUTHENTICATORS =
    BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL

private fun showBiometricPrompt(
    activity: FragmentActivity,
    onSuccess: () -> Unit,
    onError: (String) -> Unit
) {
    val available = BiometricManager.from(activity).canAuthenticate(BIOMETRIC_AUTHENTICATORS)
    if (available != BiometricManager.BIOMETRIC_SUCCESS) {
        onError("Fingerprint or device screen lock is not available.")
        return
    }

    val prompt = BiometricPrompt(
        activity,
        ContextCompat.getMainExecutor(activity),
        object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                onSuccess()
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                onError(errString.toString())
            }
        }
    )
    prompt.authenticate(
        BiometricPrompt.PromptInfo.Builder()
            .setTitle("Unlock Daily Hisab")
            .setSubtitle("Use fingerprint or your device screen lock")
            .setAllowedAuthenticators(BIOMETRIC_AUTHENTICATORS)
            .build()
    )
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
    val notificationDao = remember { FinanceDatabase.get(context).appNotificationDao() }
    val noteDao = remember { FinanceDatabase.get(context).noteDao() }
    val recurringItems by recurringDao.observeAll().collectAsState(initial = emptyList())
    val reminders by reminderDao.observeAll().collectAsState(initial = emptyList())
    val appNotifications by notificationDao.observeAll().collectAsState(initial = emptyList())
    val notes by noteDao.observeAll().collectAsState(initial = emptyList())
    val receiptDao = remember { FinanceDatabase.get(context).receiptDao() }
    val receipts by receiptDao.observeAll().collectAsState(initial = emptyList())
    val categoryDao = remember { FinanceDatabase.get(context).categoryDao() }
    val categories by categoryDao.observeAll().collectAsState(initial = emptyList())
    val loanDao = remember { FinanceDatabase.get(context).loanDao() }
    val loans by loanDao.observeAll().collectAsState(initial = emptyList())
    val loanPayments by loanDao.observePayments().collectAsState(initial = emptyList())
    val prefs = remember { context.getSharedPreferences("daily_hisab_settings", 0) }
    LaunchedEffect(Unit) {
        useBangla = prefs.getString("language", "English") == "Bangla"
        selectedCurrency = prefs.getString("currency", "BDT") ?: "BDT"
        AutomaticBackupWorker.schedule(context)
    }
    var darkMode by remember { mutableStateOf(prefs.getBoolean("dark_mode", false)) }
    var biometricEnabled by remember { mutableStateOf(prefs.getBoolean("biometric_enabled", false)) }
    var biometricUnlocked by rememberSaveable { mutableStateOf(!biometricEnabled) }
    val lifecycleOwner = LocalLifecycleOwner.current
    val auth = remember { FirebaseAuth.getInstance() }
    var authUser by remember { mutableStateOf(auth.currentUser) }
    var profileName by remember { mutableStateOf("") }
    var profilePhoto by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("") }
    var authRefresh by remember { mutableIntStateOf(0) }
    val expenses = storedTransactions.map {
        Expense(it.id, it.title, it.category, it.amount, it.date, it.time, it.type == "income", it.note)
    }

    LaunchedEffect(categories) {
        if (categories.isEmpty()) {
            listOf("Food" to "food", "Transport" to "transport", "Shopping" to "shopping", "Utilities" to "bills", "Health" to "health", "Education" to "education", "Home" to "home", "Others" to "other")
                .forEach { (name, icon) -> categoryDao.insert(CategoryEntity(name = name, iconName = icon)) }
        }
    }
    LaunchedEffect(authUser?.uid) {
        authUser?.let { user ->
            val nameKey = "profile_name_${user.uid}"
            val photoKey = "profile_photo_${user.uid}"
            val accountName = user.displayName?.trim().takeUnless { it.isNullOrBlank() }
                ?: user.email?.substringBefore("@")?.replace(".", " ")?.split(" ")
                    ?.joinToString(" ") { part -> part.replaceFirstChar { it.uppercase() } }
                ?: "Daily Hisab User"
            profileName = prefs.getString(nameKey, null)?.takeIf { it.isNotBlank() } ?: accountName
            profilePhoto = prefs.getString(photoKey, "") ?: ""
        }
    }
    DisposableEffect(auth) {
        val listener = FirebaseAuth.AuthStateListener {
            authUser = it.currentUser
            authRefresh++
        }
        auth.addAuthStateListener(listener)
        onDispose { auth.removeAuthStateListener(listener) }
    }
    DisposableEffect(lifecycleOwner, biometricEnabled) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_STOP && biometricEnabled && !biometricExternalActivityActive) {
                biometricUnlocked = false
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    if (authUser == null) {
        MaterialTheme(
            colorScheme = if (darkMode) darkColorScheme(primary = Color(0xFF9DB2FF), secondary = Orange) else lightColorScheme(primary = Blue, secondary = Orange, surface = Color.White, background = Soft)
        ) {
            AuthScreen(auth)
        }
        return
    }

    val emailVerified = authRefresh.let { authUser?.isEmailVerified == true }
    if (!emailVerified) {
        MaterialTheme(
            colorScheme = if (darkMode) darkColorScheme(primary = Color(0xFF9DB2FF), secondary = Orange) else lightColorScheme(primary = Blue, secondary = Orange, surface = Color.White, background = Soft)
        ) {
            EmailVerificationScreen(
                user = authUser!!,
                onVerified = { authRefresh++ },
                onSignOut = { auth.signOut() }
            )
        }
        return
    }

    if (biometricEnabled && !biometricUnlocked) {
        BiometricLockScreen(
            onUnlocked = { biometricUnlocked = true }
        )
        return
    }

    MaterialTheme(
        colorScheme = if (darkMode) darkColorScheme(primary = Color(0xFF9DB2FF), secondary = Orange) else lightColorScheme(primary = Blue, secondary = Orange, surface = Color.White, background = Soft),
        typography = Typography()
    ) {
        CompositionLocalProvider(
            LocalNotificationClick provides { screen = Screen.NotificationCenter },
            LocalUnreadNotificationCount provides appNotifications.count { !it.isRead }
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
                    Screen.Entries -> AllExpensesScreen(
                        expenses,
                        onUpdate = { edited -> scope.launch { dao.update(edited.toEntity()) } },
                        onDelete = { item -> scope.launch { dao.delete(storedTransactions.first { it.id == item.id }) } }
                    )
                    Screen.Categories -> CategoriesScreenV2(categories, expenses, { scope.launch { categoryDao.insert(it) } }, { scope.launch { categoryDao.delete(it) } }) {
                        selectedCategory = it.name
                        screen = Screen.CategoryDetails
                    }
                    Screen.CategoryDetails -> CategoryExpenseScreen(
                        selectedCategory,
                        expenses,
                        onUpdate = { edited -> scope.launch { dao.update(edited.toEntity()) } },
                        onDelete = { item -> scope.launch { dao.delete(storedTransactions.first { it.id == item.id }) } }
                    )
                    Screen.Budget -> FunctionalBudgetScreen(categories, expenses)
                    Screen.Loans -> LoansScreen(
                        loans = loans,
                        payments = loanPayments,
                        onAdd = { scope.launch { loanDao.insert(it) } },
                        onUpdate = { scope.launch { loanDao.update(it) } },
                        onDelete = { item -> scope.launch { FinanceDatabase.get(context).withTransaction { loanDao.deletePaymentsForLoan(item.id); loanDao.delete(item) } } },
                        onAddPayment = { scope.launch { loanDao.insertPayment(it) } },
                        onDeletePayment = { scope.launch { loanDao.deletePayment(it) } }
                    )
                    Screen.Calendar -> CalendarV2(expenses)
                    Screen.Profile -> ProfileScreen(profileName, profilePhoto, onNameChange = {
                        profileName = it
                        authUser?.uid?.let { uid -> prefs.edit().putString("profile_name_$uid", it).apply() }
                    }, onPhotoChange = {
                        profilePhoto = it
                        authUser?.uid?.let { uid -> prefs.edit().putString("profile_photo_$uid", it).apply() }
                    }, onNavigate = { screen = it }, onSignOut = { auth.signOut() })
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
                    Screen.NotificationCenter -> NotificationCenterScreen(
                        notifications = appNotifications,
                        reminders = reminders,
                        onRead = { scope.launch { notificationDao.markRead(it.id) } },
                        onReadAll = { scope.launch { notificationDao.markAllRead() } },
                        onClear = { scope.launch { notificationDao.clearAll() } }
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
                    Screen.Settings -> SettingsScreen(
                        darkMode = darkMode,
                        biometricEnabled = biometricEnabled,
                        onDarkModeChange = {
                            darkMode = it; prefs.edit().putBoolean("dark_mode", it).apply()
                        },
                        onBiometricChange = { enabled ->
                            if (!enabled) {
                                biometricEnabled = false
                                biometricUnlocked = true
                                prefs.edit().putBoolean("biometric_enabled", false).apply()
                            } else {
                                showBiometricPrompt(
                                    context as FragmentActivity,
                                    onSuccess = {
                                        biometricEnabled = true
                                        biometricUnlocked = true
                                        prefs.edit().putBoolean("biometric_enabled", true).apply()
                                    },
                                    onError = {}
                                )
                            }
                        }
                    )
                    Screen.Backup -> BackupScreen(expenses, recurringItems, reminders, notes, categories)
                    Screen.Privacy -> PrivacyPolicyScreen()
                    Screen.Help -> HelpSupportScreen()
                    }
                }
            }
        }
    }
}

@Composable
private fun BiometricLockScreen(onUnlocked: () -> Unit) {
    val activity = LocalContext.current as FragmentActivity
    var retryKey by remember { mutableIntStateOf(0) }
    var status by remember { mutableStateOf("Touch the fingerprint sensor") }
    LaunchedEffect(retryKey) {
        delay(if (retryKey == 0) 150 else 700)
        showBiometricPrompt(
            activity,
            onSuccess = onUnlocked,
            onError = {
                status = "Waiting for fingerprint…"
                retryKey++
            }
        )
    }
    MaterialTheme {
        Box(Modifier.fillMaxSize().background(Soft).padding(28.dp), contentAlignment = Alignment.Center) {
            AppCard {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Surface(Modifier.size(76.dp), CircleShape, color = Blue.copy(alpha = .12f)) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Fingerprint, null, tint = Blue, modifier = Modifier.size(40.dp))
                        }
                    }
                    Spacer(Modifier.height(18.dp))
                    Text("Daily Hisab is locked", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
                    Text("Authenticate to view your financial data.", color = Muted, fontSize = 13.sp)
                    Spacer(Modifier.height(16.dp))
                    Text(status, color = Blue, fontWeight = FontWeight.Bold)
                    if (retryKey > 0) {
                        Spacer(Modifier.height(8.dp))
                        TextButton(onClick = { retryKey++ }) {
                            Icon(Icons.Default.Refresh, null)
                            Spacer(Modifier.width(6.dp))
                            Text("Try fingerprint again")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppHeader(title: String = "Daily Hisab", subtitle: String? = null, onCalculator: (() -> Unit)? = null) {
    val openNotifications = LocalNotificationClick.current
    val unreadCount = LocalUnreadNotificationCount.current
    Row(
        modifier = Modifier.fillMaxWidth().background(Color.White).statusBarsPadding().padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(shape = RoundedCornerShape(14.dp), color = Blue, modifier = Modifier.size(46.dp)) {
            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.AccountBalanceWallet, null, tint = Color.White) }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(translated(title), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
            subtitle?.let { Text(translated(it), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Muted) }
        }
        if (onCalculator != null) {
            IconButton(onClick = onCalculator) { Icon(Icons.Default.Calculate, "Open calculator", tint = Blue) }
        }
        BadgedBox(badge = {
            if (unreadCount > 0) Badge(containerColor = Orange) {
                Text(if (unreadCount > 99) "99+" else unreadCount.toString())
            }
        }) {
            IconButton(onClick = openNotifications) { Icon(Icons.Default.NotificationsNone, "Notifications", tint = Ink) }
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
    val previousMonth = currentMonth.minusMonths(1)
    val previousMonthSpent = expenses.filter { item ->
        !item.income && runCatching { YearMonth.from(LocalDate.parse(item.date)) == previousMonth }.getOrDefault(false)
    }.sumOf { it.amount }
    val last7Spent = expenses.filter { item ->
        !item.income && runCatching {
            val date = LocalDate.parse(item.date)
            !date.isBefore(today.minusDays(6)) && !date.isAfter(today)
        }.getOrDefault(false)
    }.sumOf { it.amount }
    val previous7Spent = expenses.filter { item ->
        !item.income && runCatching {
            val date = LocalDate.parse(item.date)
            !date.isBefore(today.minusDays(13)) && date.isBefore(today.minusDays(6))
        }.getOrDefault(false)
    }.sumOf { it.amount }
    val allSpent = expenses.filterNot { it.income }.sumOf { it.amount }
    val activeExpenseDays = monthEntries.filterNot { it.income }.map { it.date }.distinct().size.coerceAtLeast(1)
    val dailyAverage = (monthSpent.toDouble() / activeExpenseDays).toInt()
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { AppHeader(subtitle = "Your Daily Expense Tracker") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                HomeHeroPager(todaySpent, monthSpent, allSpent, dailyAverage, monthIncome)
                DashboardInsights(monthEntries, monthSpent, previousMonthSpent, last7Spent, previous7Spent)
                Text("Quick Add", fontWeight = FontWeight.Bold, color = Ink)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    QuickAction("All Expenses", Icons.Default.ReceiptLong, Red) { onNavigate(Screen.Entries) }
                    QuickAction("Income", Icons.Default.Payments, Green) { onNavigate(Screen.Add) }
                    QuickAction("Categories", Icons.Default.GridView, Color(0xFF7C3AED)) { onNavigate(Screen.Categories) }
                    QuickAction("Budget", Icons.Default.AccountBalance, Muted) { onNavigate(Screen.Budget) }
                }
                Card(
                    modifier = Modifier.fillMaxWidth().clickable { onNavigate(Screen.Loans) },
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF6EC))
                ) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(Modifier.size(42.dp), RoundedCornerShape(13.dp), color = Orange.copy(.14f)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Handshake, null, tint = Orange) } }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) { Text("Loans & Dues", fontWeight = FontWeight.ExtraBold, color = Ink); Text("Borrowed, lent and payment deadlines", fontSize = 11.sp, color = Muted) }
                        Icon(Icons.Default.ChevronRight, null, tint = Muted)
                    }
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
private fun DashboardInsights(
    monthEntries: List<Expense>,
    monthSpent: Int,
    previousMonthSpent: Int,
    last7Spent: Int,
    previous7Spent: Int
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("daily_hisab_settings", 0) }
    var hidden by rememberSaveable { mutableStateOf(prefs.getBoolean("smart_insights_hidden", false)) }
    if (hidden) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF2F5FF))
        ) {
            Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.VisibilityOff, null, tint = Blue)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) { Text("Smart Insights hidden", fontWeight = FontWeight.Bold, color = Ink); Text("You can show it whenever you want.", fontSize = 10.sp, color = Muted) }
                TextButton(onClick = { hidden = false; prefs.edit().putBoolean("smart_insights_hidden", false).apply() }) { Text("Show") }
            }
        }
        return
    }
    val topCategory = monthEntries.filterNot { it.income }.groupBy { it.category }
        .mapValues { (_, items) -> items.sumOf { it.amount } }
        .maxByOrNull { it.value }
    val monthChange = if (previousMonthSpent > 0) ((monthSpent - previousMonthSpent) * 100.0 / previousMonthSpent).toInt() else null
    val weekChange = if (previous7Spent > 0) ((last7Spent - previous7Spent) * 100.0 / previous7Spent).toInt() else null
    val topShare = if (monthSpent > 0) ((topCategory?.value ?: 0) * 100 / monthSpent) else 0
    val alert = when {
        topShare >= 45 -> "${topCategory?.key} is $topShare% of this month's spending. Consider setting a category limit."
        weekChange != null && weekChange >= 25 -> "Spending rose $weekChange% this week. Review recent expenses to stay on track."
        else -> "Your spending pattern looks balanced. Keep tracking daily for better insights."
    }
    AppCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Smart Insights", fontWeight = FontWeight.ExtraBold, color = Ink, fontSize = 18.sp)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.AutoGraph, null, tint = Blue)
                TextButton(onClick = { hidden = true; prefs.edit().putBoolean("smart_insights_hidden", true).apply() }) { Text("Hide", fontSize = 11.sp) }
            }
        }
        Spacer(Modifier.height(13.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            InsightMetric(
                "vs last month",
                monthChange?.let { "${if (it > 0) "+" else ""}$it%" } ?: "New",
                if ((monthChange ?: 0) > 0) Red else Green,
                Modifier.weight(1f)
            )
            InsightMetric("Top category", topCategory?.key ?: "—", Orange, Modifier.weight(1f))
            InsightMetric(
                "Weekly trend",
                weekChange?.let { "${if (it > 0) "+" else ""}$it%" } ?: money(last7Spent),
                if ((weekChange ?: 0) > 0) Red else Green,
                Modifier.weight(1f)
            )
        }
        Spacer(Modifier.height(12.dp))
        Surface(shape = RoundedCornerShape(14.dp), color = if (topShare >= 45 || (weekChange ?: 0) >= 25) Orange.copy(.1f) else Green.copy(.09f)) {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
                Icon(Icons.Default.Lightbulb, null, tint = if (topShare >= 45 || (weekChange ?: 0) >= 25) Orange else Green, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(8.dp))
                Text(alert, color = Ink, fontSize = 11.sp, lineHeight = 16.sp)
            }
        }
    }
}

@Composable
private fun InsightMetric(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Surface(modifier, RoundedCornerShape(13.dp), color = color.copy(.09f)) {
        Column(Modifier.padding(horizontal = 9.dp, vertical = 10.dp)) {
            Text(label, color = Muted, fontSize = 9.sp, maxLines = 1)
            Text(value, color = color, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp, maxLines = 1)
        }
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
                Text(money(todaySpent), color = Color.White, fontSize = 38.sp, fontWeight = FontWeight.ExtraBold)
            }
            HorizontalDivider(color = Color.White.copy(.18f))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                HeroMetric("This Month", money(monthSpent), Color.White)
                HeroMetric("All Expense", money(allSpent), Color.White)
                HeroMetric("Daily Average", money(dailyAverage), Color(0xFFFFD166))
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
            Text(money(income - spent), color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
            HorizontalDivider(color = Color.White.copy(.16f))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                HeroMetric("Income", money(income), Green)
                HeroMetric("Expense", money(spent), Color(0xFFFF7A7A))
                HeroMetric("Savings", money(income - spent), Color.White)
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
                    Box(contentAlignment = Alignment.Center) { Text("${money(spent)}\nTotal", fontWeight = FontWeight.Bold, color = Ink) }
                }
            }
            Spacer(Modifier.width(18.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (categories.isEmpty()) Text("No expenses this month", color = Muted, fontSize = 12.sp)
                categories.forEachIndexed { index, (name, amount) -> Legend(name, money(amount), colors[index]) }
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
        Text("${if (expense.income) "+" else "-"}${money(expense.amount)}", color = if (expense.income) Green else Red, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun ReportsScreen(expenses: List<Expense>, onAnalytics: () -> Unit) {
    val context = LocalContext.current
    var period by remember { mutableStateOf("Monthly") }
    val visible = remember(expenses, period) { expensesForPeriod(expenses, period, LocalDate.now()) }
    val createPdf = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/pdf")) { uri ->
        biometricExternalActivityActive = false
        if (uri != null) exportPdf(context, uri, visible, period)
    }
    val createCsv = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/csv")) { uri ->
        biometricExternalActivityActive = false
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
                        SummaryMetric("Entries", visible.size, Blue, showCurrency = false)
                    }
                }
                Button(onClick = { biometricExternalActivityActive = true; createPdf.launch("daily-hisab-${period.lowercase()}.pdf") }, Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.PictureAsPdf, null); Spacer(Modifier.width(8.dp)); Text("Export PDF")
                }
                OutlinedButton(onClick = { biometricExternalActivityActive = true; createCsv.launch("daily-hisab-${period.lowercase()}.csv") }, Modifier.fillMaxWidth()) {
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
                            Text(money(amount), Modifier.width(86.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End, fontSize = 12.sp, fontWeight = FontWeight.Bold)
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
    val focusManager = LocalFocusManager.current
    val keyboardController = LocalSoftwareKeyboardController.current
    var amount by remember { mutableStateOf("") }
    var category by remember { mutableStateOf(categories.firstOrNull()?.name ?: "Food") }
    var title by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var isIncome by remember { mutableStateOf(false) }
    var date by remember { mutableStateOf(LocalDate.now()) }
    var receiptUri by remember { mutableStateOf<String?>(null) }
    var showCategoryDialog by remember { mutableStateOf(false) }
    var calculatorMode by remember { mutableIntStateOf(0) }
    var calculatorOffset by remember { mutableStateOf(androidx.compose.ui.unit.IntOffset(-24, -190)) }
    val receiptPicker = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            runCatching { context.contentResolver.takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            receiptUri = uri.toString()
        }
    }
    if (showCategoryDialog) CategoryDialog({ showCategoryDialog = false }) {
        onAddCategory(it); category = it.name; showCategoryDialog = false
    }
    Column(
        Modifier.fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .pointerInput(Unit) {
                detectTapGestures(onTap = {
                    focusManager.clearFocus()
                    keyboardController?.hide()
                })
            }
    ) {
        AppHeader("Add Expense", onCalculator = { calculatorMode = if (calculatorMode == 0) 1 else 0 })
        LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    SegmentedButton(selected = !isIncome, onClick = { isIncome = false }, shape = SegmentedButtonDefaults.itemShape(0, 2)) { Text("Expense") }
                    SegmentedButton(selected = isIncome, onClick = { isIncome = true }, shape = SegmentedButtonDefaults.itemShape(1, 2)) { Text("Income") }
                }
            }
            item {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Title") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next)
                )
            }
            item {
                OutlinedTextField(
                    value = amount,
                    onValueChange = { amount = it.filter(Char::isDigit) },
                    label = { Text("Amount") },
                    leadingIcon = { Text(when (selectedCurrency) { "USD" -> "$"; "USDT" -> "₮"; else -> "৳" }, fontSize = 24.sp, fontWeight = FontWeight.Bold) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus(); keyboardController?.hide() })
                )
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
    if (calculatorMode == 1) {
        androidx.compose.ui.window.Popup(
            alignment = Alignment.BottomEnd,
            offset = calculatorOffset,
            onDismissRequest = { calculatorMode = 0 }
        ) {
            CalculatorWidget(
                compact = true,
                onClose = { calculatorMode = 0 },
                onResize = { calculatorMode = 2 },
                onUseResult = { amount = it },
                onDrag = { dx, dy -> calculatorOffset = androidx.compose.ui.unit.IntOffset(calculatorOffset.x + dx.toInt(), calculatorOffset.y + dy.toInt()) }
            )
        }
    }
    if (calculatorMode == 2) {
        androidx.compose.ui.window.Dialog(onDismissRequest = { calculatorMode = 1 }, properties = androidx.compose.ui.window.DialogProperties(usePlatformDefaultWidth = false)) {
            Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
                CalculatorWidget(
                    compact = false,
                    onClose = { calculatorMode = 0 },
                    onResize = { calculatorMode = 1 },
                    onUseResult = { amount = it; calculatorMode = 1 },
                    onDrag = { _, _ -> }
                )
            }
        }
    }
}

@Composable
private fun CalculatorWidget(
    compact: Boolean,
    onClose: () -> Unit,
    onResize: () -> Unit,
    onUseResult: (String) -> Unit,
    onDrag: (Float, Float) -> Unit
) {
    var display by remember { mutableStateOf("0") }
    var stored by remember { mutableDoubleStateOf(0.0) }
    var operation by remember { mutableStateOf<String?>(null) }
    var replaceDisplay by remember { mutableStateOf(false) }

    fun formatted(value: Double): String =
        if (value % 1.0 == 0.0) value.toLong().toString() else String.format(Locale.US, "%.2f", value).trimEnd('0').trimEnd('.')

    val expression = if (operation != null) "${formatted(stored)} $operation ${if (replaceDisplay) "" else display}" else display

    fun calculate() {
        val current = display.toDoubleOrNull() ?: 0.0
        val result = when (operation) {
            "+" -> stored + current
            "-" -> stored - current
            "×" -> stored * current
            "÷" -> if (current == 0.0) 0.0 else stored / current
            else -> current
        }
        display = formatted(result)
        stored = result
        operation = null
        replaceDisplay = true
    }

    fun press(value: String) {
        when (value) {
            "C" -> { display = "0"; stored = 0.0; operation = null; replaceDisplay = false }
            "⌫" -> display = if (display.length > 1) display.dropLast(1) else "0"
            "+", "-", "×", "÷" -> {
                if (operation != null && !replaceDisplay) calculate()
                stored = display.toDoubleOrNull() ?: 0.0
                operation = value
                replaceDisplay = true
            }
            "=" -> calculate()
            "." -> {
                if (replaceDisplay) { display = "0."; replaceDisplay = false }
                else if (!display.contains(".")) display += "."
            }
            else -> {
                display = if (replaceDisplay || display == "0") value else display + value
                replaceDisplay = false
            }
        }
    }

    Card(
        modifier = if (compact) Modifier.width(270.dp) else Modifier.fillMaxWidth().widthIn(max = 440.dp).padding(20.dp),
        shape = RoundedCornerShape(if (compact) 22.dp else 28.dp),
        elevation = CardDefaults.cardElevation(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(Modifier.padding(if (compact) 12.dp else 20.dp), verticalArrangement = Arrangement.spacedBy(if (compact) 7.dp else 12.dp)) {
            Row(
                Modifier.fillMaxWidth().then(
                    if (compact) Modifier.pointerInput(Unit) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            onDrag(dragAmount.x, dragAmount.y)
                        }
                    } else Modifier
                ),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Calculate, null, tint = Blue)
                Text(if (compact) " Calculator • drag" else " Calculator", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold)
                IconButton(onClick = onResize, modifier = Modifier.size(34.dp)) { Icon(if (compact) Icons.Default.OpenInFull else Icons.Default.CloseFullscreen, if (compact) "Expand" else "Minimize") }
                IconButton(onClick = onClose, modifier = Modifier.size(34.dp)) { Icon(Icons.Default.Close, "Close") }
            }
            Surface(Modifier.fillMaxWidth(), RoundedCornerShape(14.dp), color = Soft) {
                Text(expression, Modifier.padding(horizontal = 14.dp, vertical = if (compact) 12.dp else 20.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End, fontSize = if (compact) 25.sp else 38.sp, fontWeight = FontWeight.ExtraBold, color = Ink, maxLines = 1)
            }
            val keys = listOf(listOf("C", "⌫", "÷"), listOf("7", "8", "9", "×"), listOf("4", "5", "6", "-"), listOf("1", "2", "3", "+"), listOf("0", ".", "="))
            keys.forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(if (compact) 5.dp else 9.dp)) {
                    row.forEach { key ->
                        FilledTonalButton(
                            onClick = { press(key) },
                            modifier = Modifier.weight(1f).height(if (compact) 38.dp else 54.dp),
                            contentPadding = PaddingValues(0.dp),
                            colors = ButtonDefaults.filledTonalButtonColors(containerColor = if (key in listOf("+", "-", "×", "÷", "=")) Blue else Soft, contentColor = if (key in listOf("+", "-", "×", "÷", "=")) Color.White else Ink)
                        ) { Text(key, fontWeight = FontWeight.Bold, fontSize = if (compact) 14.sp else 18.sp) }
                    }
                }
            }
            Button(onClick = { onUseResult(display.substringBefore(".")) }, Modifier.fillMaxWidth().height(if (compact) 40.dp else 50.dp)) {
                Text("Use as amount")
            }
        }
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
                SectionTitle(selected.format(DateTimeFormatter.ofPattern("EEEE, dd MMMM")), money(visible.filterNot { it.income }.sumOf { it.amount }))
            }
        }
        if (visible.isEmpty()) item { Text("No entries for this date", Modifier.padding(24.dp), color = Muted) }
        items(visible) { TransactionRow(it) }
    }
}

@Composable
private fun AllExpensesScreen(expenses: List<Expense>, onUpdate: (Expense) -> Unit, onDelete: (Expense) -> Unit) {
    FilteredExpenseScreen("All Expenses", expenses.filterNot { it.income }, onUpdate, onDelete)
}

@Composable
private fun CategoryExpenseScreen(category: String, expenses: List<Expense>, onUpdate: (Expense) -> Unit, onDelete: (Expense) -> Unit) {
    FilteredExpenseScreen(category, expenses.filter { !it.income && it.category == category }, onUpdate, onDelete)
}

@Composable
private fun FilteredExpenseScreen(title: String, expenses: List<Expense>, onUpdate: (Expense) -> Unit, onDelete: (Expense) -> Unit) {
    val context = LocalContext.current
    var period by remember { mutableStateOf("Daily") }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var editing by remember { mutableStateOf<Expense?>(null) }
    val visible = remember(expenses, period, selectedDate) { expensesForPeriod(expenses, period, selectedDate) }
    val total = visible.sumOf { it.amount }
    editing?.let { item ->
        ExpenseEditDialog(item, onDismiss = { editing = null }) {
            onUpdate(it)
            editing = null
        }
    }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader(title) }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Card(colors = CardDefaults.cardColors(containerColor = Color.Transparent), shape = RoundedCornerShape(22.dp)) {
                    Column(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Navy, Blue, Color(0xFF0EA5E9)))).padding(20.dp)) {
                        Text("${selectedDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy"))} • $period", color = Color.White.copy(.75f), fontSize = 12.sp)
                        Text(money(total), color = Color.White, fontSize = 34.sp, fontWeight = FontWeight.ExtraBold)
                        Text("${visible.size} expense entries", color = Color.White.copy(.75f), fontSize = 12.sp)
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    listOf("Daily", "Weekly", "Monthly", "Yearly").forEach { value ->
                        FilterChip(
                            period == value,
                            {
                                period = value
                                selectedDate = LocalDate.now()
                            },
                            { Text(value, fontSize = 10.sp) }
                        )
                    }
                }
                OutlinedButton(onClick = {
                    DatePickerDialog(context, { _, year, month, day ->
                        selectedDate = LocalDate.of(year, month + 1, day)
                        period = "Daily"
                    }, selectedDate.year, selectedDate.monthValue - 1, selectedDate.dayOfMonth).show()
                }, Modifier.fillMaxWidth()) {
                    Icon(Icons.Default.CalendarMonth, null); Spacer(Modifier.width(8.dp)); Text("Select date: ${selectedDate.format(DateTimeFormatter.ofPattern("dd MMM yyyy"))}")
                }
                SectionTitle("$period expenses", "${visible.size}")
            }
        }
        if (visible.isEmpty()) item { Text("No expenses found for this period", Modifier.padding(24.dp), color = Muted) }
        items(visible, key = { it.id }) { expense ->
            Row(Modifier.padding(horizontal = 16.dp, vertical = 5.dp).fillMaxWidth().background(Color.White, RoundedCornerShape(18.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f)) { TransactionRowContent(expense) }
                IconButton(onClick = { editing = expense }) { Icon(Icons.Default.Edit, "Edit expense", tint = Blue) }
                IconButton(onClick = { onDelete(expense) }) { Icon(Icons.Default.DeleteOutline, "Delete", tint = Red) }
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun ExpenseEditDialog(expense: Expense, onDismiss: () -> Unit, onSave: (Expense) -> Unit) {
    val context = LocalContext.current
    var title by remember(expense.id) { mutableStateOf(expense.title) }
    var category by remember(expense.id) { mutableStateOf(expense.category) }
    var amount by remember(expense.id) { mutableStateOf(expense.amount.toString()) }
    var note by remember(expense.id) { mutableStateOf(expense.note) }
    var date by remember(expense.id) { mutableStateOf(runCatching { LocalDate.parse(expense.date) }.getOrDefault(LocalDate.now())) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit expense") },
        text = {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { OutlinedTextField(title, { title = it }, label = { Text("Title") }) }
                item { OutlinedTextField(category, { category = it }, label = { Text("Category") }) }
                item { OutlinedTextField(amount, { amount = it.filter(Char::isDigit) }, label = { Text("Amount") }, leadingIcon = { Text("৳") }) }
                item { OutlinedTextField(note, { note = it }, label = { Text("Note") }) }
                item {
                    OutlinedButton(onClick = {
                        DatePickerDialog(context, { _, year, month, day -> date = LocalDate.of(year, month + 1, day) }, date.year, date.monthValue - 1, date.dayOfMonth).show()
                    }, Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.CalendarMonth, null); Spacer(Modifier.width(8.dp)); Text(date.format(DateTimeFormatter.ofPattern("dd MMM yyyy")))
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(expense.copy(title = title.trim(), category = category.trim(), amount = amount.toInt(), date = date.toString(), note = note)) },
                enabled = title.isNotBlank() && category.isNotBlank() && amount.toIntOrNull() != null
            ) { Text("Save changes") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
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
private fun SummaryMetric(label: String, amount: Int, color: Color, showCurrency: Boolean = true) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, fontSize = 11.sp, color = Muted)
        Text(if (showCurrency) money(amount) else amount.toString(), fontWeight = FontWeight.ExtraBold, color = color)
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
        Text("${if (expense.income) "+" else "-"}${money(expense.amount)}", color = if (expense.income) Green else Red, fontWeight = FontWeight.Bold)
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
private fun CategoriesScreenV2(categories: List<CategoryEntity>, expenses: List<Expense>, onAdd: (CategoryEntity) -> Unit, onDelete: (CategoryEntity) -> Unit, onOpen: (CategoryEntity) -> Unit) {
    var showDialog by remember { mutableStateOf(false) }
    var deleteCandidate by remember { mutableStateOf<CategoryEntity?>(null) }
    if (showDialog) CategoryDialog({ showDialog = false }) { onAdd(it); showDialog = false }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Categories") }
        items(categories.chunked(2)) { row ->
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { item ->
                    Card(
                        Modifier.weight(1f).pointerInput(item.id) {
                            detectTapGestures(
                                onTap = { onOpen(item) },
                                onLongPress = { deleteCandidate = item }
                            )
                        },
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(Modifier.fillMaxWidth().padding(14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(categoryIcon(item.iconName), null, tint = Blue, modifier = Modifier.size(34.dp))
                            Text(item.name, fontWeight = FontWeight.Bold)
                            Text(money(expenses.filter { !it.income && it.category == item.name }.sumOf { it.amount }), color = Muted, fontSize = 11.sp)
                            Text("Hold to manage", color = Muted, fontSize = 9.sp, modifier = Modifier.padding(top = 8.dp))
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
        item { Button(onClick = { showDialog = true }, Modifier.padding(16.dp).fillMaxWidth()) { Icon(Icons.Default.Add, null); Text("Add Category") } }
    }
    deleteCandidate?.let { item ->
        AlertDialog(
            onDismissRequest = { deleteCandidate = null },
            icon = { Icon(Icons.Default.DeleteOutline, null, tint = Red) },
            title = { Text("Delete ${item.name} category?") },
            text = { Text("The category will be removed from your category list. Existing expense records will remain unchanged.") },
            confirmButton = {
                Button(
                    onClick = { onDelete(item); deleteCandidate = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Red)
                ) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { deleteCandidate = null }) { Text("Cancel") } }
        )
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
                                    Text(money(expenses.filter { !it.income && it.category == name }.sumOf { it.amount }), color = Muted)
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
private fun FunctionalBudgetScreen(categories: List<CategoryEntity>, expenses: List<Expense>) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("daily_hisab_budget", 0) }
    var budget by remember { mutableIntStateOf(prefs.getInt("monthly_budget", 0)) }
    var editingCategory by remember { mutableStateOf<String?>(null) }
    var editValue by remember { mutableStateOf("") }
    val month = YearMonth.now()
    val monthExpenses = expenses.filter { item ->
        !item.income && runCatching { YearMonth.from(LocalDate.parse(item.date)) == month }.getOrDefault(false)
    }
    val spent = monthExpenses.sumOf { it.amount }
    val remaining = budget - spent
    val remainingDays = (month.lengthOfMonth() - LocalDate.now().dayOfMonth + 1).coerceAtLeast(1)
    val elapsedDays = LocalDate.now().dayOfMonth.coerceAtLeast(1)
    val projectedSpend = (spent.toDouble() / elapsedDays * month.lengthOfMonth()).toInt()
    val projectedOver = projectedSpend - budget
    val progress = if (budget > 0) (spent.toFloat() / budget).coerceIn(0f, 1f) else 0f
    if (editingCategory != null) {
        AlertDialog(
            onDismissRequest = { editingCategory = null },
            title = { Text(if (editingCategory == "_total") "Set monthly budget" else "Set ${editingCategory} budget") },
            text = { OutlinedTextField(editValue, { editValue = it.filter(Char::isDigit) }, label = { Text("Amount") }, leadingIcon = { Text("৳") }) },
            confirmButton = {
                Button(onClick = {
                    val value = editValue.toIntOrNull() ?: 0
                    if (editingCategory == "_total") {
                        budget = value
                        prefs.edit().putInt("monthly_budget", value).apply()
                    } else prefs.edit().putInt("category_${editingCategory}", value).apply()
                    editingCategory = null
                }, enabled = editValue.isNotBlank()) { Text("Save") }
            },
            dismissButton = { TextButton(onClick = { editingCategory = null }) { Text("Cancel") } }
        )
    }
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Budget") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                AppCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column { Text("Monthly Budget", color = Muted); Text(money(budget), fontSize = 27.sp, fontWeight = FontWeight.ExtraBold, color = Ink) }
                        IconButton(onClick = { editingCategory = "_total"; editValue = budget.toString() }) { Icon(Icons.Default.Edit, "Edit budget", tint = Blue) }
                    }
                    Text("Spent ${money(spent)}  •  ${if (remaining >= 0) "Remaining ${money(remaining)}" else "Over ${money(-remaining)}"}", color = if (remaining >= 0) Muted else Red)
                    Spacer(Modifier.height(12.dp))
                    LinearProgressIndicator(progress = { progress }, Modifier.fillMaxWidth().height(12.dp), color = if (spent > budget) Red else Orange, trackColor = Color(0xFFFFE4E6))
                    Text("${(progress * 100).toInt()}% used", fontSize = 12.sp, color = Muted)
                }
                AppCard {
                    Text("Daily Allowance", color = Muted)
                    Text(money(maxOf(remaining, 0) / remainingDays), fontSize = 28.sp, fontWeight = FontWeight.ExtraBold, color = Blue)
                    Text("$remainingDays days remaining this month", fontSize = 11.sp, color = Muted)
                }
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(Modifier.size(42.dp), CircleShape, color = (if (projectedOver > 0) Red else Green).copy(.1f)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.TrendingUp, null, tint = if (projectedOver > 0) Red else Green)
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Month-end forecast", color = Muted, fontSize = 11.sp)
                            Text(money(projectedSpend), fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        when {
                            budget <= 0 -> "Set a monthly budget to activate forecasting."
                            projectedOver > 0 -> "At the current pace you may exceed the budget by ${money(projectedOver)}."
                            else -> "At the current pace you may finish ${money(-projectedOver)} under budget."
                        },
                        color = if (budget > 0 && projectedOver > 0) Red else Green,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Text("Budget by Category", fontWeight = FontWeight.ExtraBold, color = Ink)
            }
        }
        items(categories, key = { it.id }) { category ->
            val limit = prefs.getInt("category_${category.name}", 0)
            val categorySpent = monthExpenses.filter { it.category == category.name }.sumOf { it.amount }
            AppCardContainer(Modifier.padding(horizontal = 16.dp, vertical = 5.dp)) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Icon(categoryIcon(category.iconName), null, tint = Blue)
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(category.name, fontWeight = FontWeight.Bold)
                        Text("${money(categorySpent)} / ${money(limit)}", fontSize = 12.sp, color = Muted)
                    }
                    IconButton(onClick = { editingCategory = category.name; editValue = limit.toString() }) { Icon(Icons.Default.Edit, "Edit category budget") }
                }
                LinearProgressIndicator(progress = { if (limit > 0) (categorySpent.toFloat() / limit).coerceIn(0f, 1f) else 0f }, Modifier.fillMaxWidth(), color = if (categorySpent > limit) Red else Blue)
            }
        }
        item { Spacer(Modifier.height(24.dp)) }
    }
}

@Composable
private fun AppCardContainer(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Card(modifier = modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
        Column(Modifier.padding(16.dp), content = content)
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
private fun LoansScreen(
    loans: List<LoanEntity>,
    payments: List<LoanPaymentEntity>,
    onAdd: (LoanEntity) -> Unit,
    onUpdate: (LoanEntity) -> Unit,
    onDelete: (LoanEntity) -> Unit,
    onAddPayment: (LoanPaymentEntity) -> Unit,
    onDeletePayment: (LoanPaymentEntity) -> Unit
) {
    var type by remember { mutableStateOf("borrowed") }
    var editor by remember { mutableStateOf<LoanEntity?>(null) }
    var showEditor by remember { mutableStateOf(false) }
    var paymentLoan by remember { mutableStateOf<LoanEntity?>(null) }
    val today = LocalDate.now().toString()
    fun paid(loan: LoanEntity) = payments.filter { it.loanId == loan.id }.sumOf { it.amount }
    fun remaining(loan: LoanEntity) = (loan.amount - paid(loan)).coerceAtLeast(0)
    val payable = loans.filter { it.type == "borrowed" }.sumOf { remaining(it) }
    val receivable = loans.filter { it.type == "lent" }.sumOf { remaining(it) }
    val overdue = loans.count { remaining(it) > 0 && it.dueDate < today }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { AppHeader("Loans & Dues") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    LoanSummary("Payable", payable, Orange, Modifier.weight(1f))
                    LoanSummary("Receivable", receivable, Green, Modifier.weight(1f))
                    LoanSummary("Overdue", overdue, Red, Modifier.weight(1f), true)
                }
                Row(Modifier.fillMaxWidth().background(Color(0xFFE9EDF8), RoundedCornerShape(14.dp)).padding(4.dp)) {
                    listOf("borrowed" to "Borrowed", "lent" to "Lent").forEach { (value, label) ->
                        Surface(
                            modifier = Modifier.weight(1f).clickable { type = value },
                            shape = RoundedCornerShape(11.dp),
                            color = if (type == value) Color.White else Color.Transparent,
                            shadowElevation = if (type == value) 2.dp else 0.dp
                        ) { Text(label, Modifier.padding(11.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.Bold, color = if (type == value) Blue else Muted) }
                    }
                }
                Button(onClick = { editor = null; showEditor = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) { Icon(Icons.Default.Add, null); Spacer(Modifier.width(6.dp)); Text("Add ${if (type == "borrowed") "borrowed money" else "money lent"}") }
            }
        }
        val visible = loans.filter { it.type == type }
        if (visible.isEmpty()) item {
            Column(Modifier.fillMaxWidth().padding(42.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(Icons.Default.Handshake, null, tint = Blue, modifier = Modifier.size(48.dp)); Spacer(Modifier.height(12.dp))
                Text("No ${type} records yet", fontWeight = FontWeight.ExtraBold, color = Ink)
                Text("Add a person, amount and return deadline.", fontSize = 12.sp, color = Muted)
            }
        }
        items(visible, key = { it.id }) { loan ->
            val paidAmount = paid(loan); val balance = remaining(loan); val isPaid = balance == 0; val isOverdue = !isPaid && loan.dueDate < today
            Card(Modifier.padding(horizontal = 16.dp, vertical = 6.dp).fillMaxWidth(), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    Row(verticalAlignment = Alignment.Top) {
                        Surface(Modifier.size(44.dp), RoundedCornerShape(14.dp), color = if (type == "borrowed") Orange.copy(.12f) else Green.copy(.12f)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Person, null, tint = if (type == "borrowed") Orange else Green) } }
                        Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f)) { Text(loan.person, fontWeight = FontWeight.ExtraBold, color = Ink); Text("Due ${loan.dueDate}", fontSize = 11.sp, color = Muted); Surface(shape = RoundedCornerShape(20.dp), color = when { isPaid -> Green.copy(.12f); isOverdue -> Red.copy(.12f); paidAmount > 0 -> Orange.copy(.12f); else -> Blue.copy(.1f) }) { Text(when { isPaid -> "Paid"; isOverdue -> "Overdue"; paidAmount > 0 -> "Partial"; else -> "Pending" }, Modifier.padding(horizontal = 8.dp, vertical = 3.dp), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = when { isPaid -> Green; isOverdue -> Red; paidAmount > 0 -> Orange; else -> Blue }) } }
                        IconButton(onClick = { editor = loan; showEditor = true }) { Icon(Icons.Default.Edit, "Edit", tint = Muted) }
                        IconButton(onClick = { onDelete(loan) }) { Icon(Icons.Default.DeleteOutline, "Delete", tint = Red) }
                    }
                    Row(Modifier.fillMaxWidth().background(Soft, RoundedCornerShape(14.dp)).padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        LoanAmount("Total", loan.amount); LoanAmount("Paid", paidAmount); LoanAmount("Remaining", balance, Blue)
                    }
                    LinearProgressIndicator(progress = { if (loan.amount == 0) 0f else (paidAmount.toFloat() / loan.amount).coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth(), color = if (isPaid) Green else if (isOverdue) Red else Blue, trackColor = Color(0xFFE5E8F2))
                    if (loan.note.isNotBlank()) Text(loan.note, fontSize = 12.sp, color = Muted)
                    if (!isPaid) OutlinedButton(onClick = { paymentLoan = loan }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(13.dp)) { Icon(Icons.Default.Add, null); Text("Record payment") }
                    val history = payments.filter { it.loanId == loan.id }
                    if (history.isNotEmpty()) {
                        HorizontalDivider(color = Color(0xFFEDF0F6)); Text("Payment history", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Ink)
                        history.forEach { payment -> Row(Modifier.fillMaxWidth().background(Soft, RoundedCornerShape(12.dp)).padding(10.dp), verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f)) { Text(money(payment.amount), fontWeight = FontWeight.Bold, color = Green); Text("${payment.date}${if (payment.note.isBlank()) "" else " · ${payment.note}"}", fontSize = 10.sp, color = Muted) }; IconButton(onClick = { onDeletePayment(payment) }, modifier = Modifier.size(32.dp)) { Icon(Icons.Default.Close, "Delete payment", tint = Red, modifier = Modifier.size(16.dp)) } } }
                    }
                }
            }
        }
    }
    if (showEditor) LoanEditorDialog(type, editor, onDismiss = { showEditor = false }, onSave = { value -> if (editor == null) onAdd(value) else onUpdate(value); showEditor = false })
    paymentLoan?.let { loan -> LoanPaymentDialog(loan, remaining(loan), onDismiss = { paymentLoan = null }, onSave = { onAddPayment(it); paymentLoan = null }) }
}

@Composable private fun LoanSummary(label: String, value: Int, color: Color, modifier: Modifier, count: Boolean = false) { Card(modifier, shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = Color.White)) { Column(Modifier.padding(11.dp)) { Icon(if (count) Icons.Default.Schedule else Icons.Default.AccountBalanceWallet, null, tint = color, modifier = Modifier.size(20.dp)); Spacer(Modifier.height(8.dp)); Text(label, maxLines = 1, fontSize = 9.sp, color = Muted); Text(if (count) "$value items" else money(value), maxLines = 1, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = Ink) } } }
@Composable private fun LoanAmount(label: String, value: Int, color: Color = Ink) { Column(horizontalAlignment = Alignment.CenterHorizontally) { Text(label.uppercase(), fontSize = 9.sp, color = Muted); Text(money(value), fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = color) } }

@Composable
private fun LoanEditorDialog(type: String, editing: LoanEntity?, onDismiss: () -> Unit, onSave: (LoanEntity) -> Unit) {
    val context = LocalContext.current
    var loanType by remember { mutableStateOf(editing?.type ?: type) }; var person by remember { mutableStateOf(editing?.person ?: "") }; var amount by remember { mutableStateOf(editing?.amount?.toString() ?: "") }; var startDate by remember { mutableStateOf(editing?.startDate ?: LocalDate.now().toString()) }; var dueDate by remember { mutableStateOf(editing?.dueDate ?: LocalDate.now().plusMonths(1).toString()) }; var note by remember { mutableStateOf(editing?.note ?: "") }
    fun pickDate(current: String, update: (String) -> Unit) { val date = runCatching { LocalDate.parse(current) }.getOrDefault(LocalDate.now()); DatePickerDialog(context, { _, y, m, d -> update(LocalDate.of(y, m + 1, d).toString()) }, date.year, date.monthValue - 1, date.dayOfMonth).show() }
    AlertDialog(onDismissRequest = onDismiss, title = { Text(if (editing == null) "Add loan record" else "Edit loan record") }, text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { Row(Modifier.fillMaxWidth()) { FilterChip(loanType == "borrowed", { loanType = "borrowed" }, { Text("Borrowed") }, modifier = Modifier.weight(1f)); Spacer(Modifier.width(8.dp)); FilterChip(loanType == "lent", { loanType = "lent" }, { Text("Lent") }, modifier = Modifier.weight(1f)) }; OutlinedTextField(person, { person = it }, label = { Text("Person name") }, singleLine = true, modifier = Modifier.fillMaxWidth()); OutlinedTextField(amount, { amount = it.filter(Char::isDigit) }, label = { Text("Total amount") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true, modifier = Modifier.fillMaxWidth()); OutlinedButton({ pickDate(startDate) { startDate = it } }, Modifier.fillMaxWidth()) { Icon(Icons.Default.CalendarMonth, null); Spacer(Modifier.width(6.dp)); Text("Start: $startDate") }; OutlinedButton({ pickDate(dueDate) { dueDate = it } }, Modifier.fillMaxWidth()) { Icon(Icons.Default.Event, null); Spacer(Modifier.width(6.dp)); Text("Due: $dueDate") }; OutlinedTextField(note, { note = it }, label = { Text("Note (optional)") }, modifier = Modifier.fillMaxWidth()) } }, confirmButton = { Button(onClick = { val number = amount.toIntOrNull() ?: 0; if (person.isNotBlank() && number > 0) onSave(LoanEntity(editing?.id ?: 0, loanType, person.trim(), number, startDate, dueDate, note.trim())) }) { Text("Save") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
}

@Composable
private fun LoanPaymentDialog(loan: LoanEntity, remaining: Int, onDismiss: () -> Unit, onSave: (LoanPaymentEntity) -> Unit) {
    val context = LocalContext.current; var amount by remember { mutableStateOf(remaining.toString()) }; var date by remember { mutableStateOf(LocalDate.now().toString()) }; var note by remember { mutableStateOf("") }
    AlertDialog(onDismissRequest = onDismiss, title = { Text("Record payment") }, text = { Column(verticalArrangement = Arrangement.spacedBy(10.dp)) { Text("Remaining: ${money(remaining)}", color = Blue, fontWeight = FontWeight.Bold); OutlinedTextField(amount, { amount = it.filter(Char::isDigit) }, label = { Text("Payment amount") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), modifier = Modifier.fillMaxWidth()); OutlinedButton(onClick = { val current = LocalDate.parse(date); DatePickerDialog(context, { _, y, m, d -> date = LocalDate.of(y, m + 1, d).toString() }, current.year, current.monthValue - 1, current.dayOfMonth).show() }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Default.CalendarMonth, null); Text(date) }; OutlinedTextField(note, { note = it }, label = { Text("Note (optional)") }, modifier = Modifier.fillMaxWidth()) } }, confirmButton = { Button(onClick = { val number = amount.toIntOrNull() ?: 0; if (number in 1..remaining) onSave(LoanPaymentEntity(loanId = loan.id, amount = number, date = date, note = note.trim())) }) { Text("Save payment") } }, dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } })
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
        AddReminderDialog(
            onDismiss = { showAdd = false },
            onSave = {
                onAdd(it)
                showAdd = false
            }
        )
    }
}

@Composable
private fun NotificationCenterScreen(
    notifications: List<AppNotificationEntity>,
    reminders: List<ReminderEntity>,
    onRead: (AppNotificationEntity) -> Unit,
    onReadAll: () -> Unit,
    onClear: () -> Unit
) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 28.dp)) {
        item { AppHeader("Notifications") }
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Notification Center", fontSize = 23.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
                    Text("${notifications.count { !it.isRead }} unread", color = Muted, fontSize = 12.sp)
                }
                Row {
                    TextButton(onClick = onReadAll, enabled = notifications.any { !it.isRead }) { Text("Read all") }
                    TextButton(onClick = onClear, enabled = notifications.isNotEmpty()) { Text("Clear") }
                }
            }
        }
        if (notifications.isEmpty()) {
            item {
                AppCardContainer(Modifier.padding(horizontal = 16.dp)) {
                    Icon(Icons.Default.NotificationsNone, null, tint = Blue, modifier = Modifier.size(34.dp))
                    Spacer(Modifier.height(8.dp))
                    Text("You're all caught up", fontWeight = FontWeight.ExtraBold, color = Ink)
                    Text("Daily reminders, budget alerts and scheduled reminders will appear here.", color = Muted, fontSize = 12.sp)
                }
            }
        } else {
            items(notifications, key = { it.id }) { item ->
                val color = when (item.type) {
                    "budget" -> Orange
                    "reminder" -> Blue
                    else -> Color(0xFF7C3AED)
                }
                Card(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 5.dp).fillMaxWidth()
                        .clickable { onRead(item) },
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = if (item.isRead) Color.White else color.copy(.09f))
                ) {
                    Row(Modifier.padding(15.dp), verticalAlignment = Alignment.Top) {
                        Surface(Modifier.size(40.dp), CircleShape, color = color.copy(.13f)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    if (item.type == "budget") Icons.Default.AccountBalanceWallet else Icons.Default.NotificationsActive,
                                    null,
                                    tint = color,
                                    modifier = Modifier.size(21.dp)
                                )
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(item.title, Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, color = Ink)
                                if (!item.isRead) Box(Modifier.size(8.dp).background(Orange, CircleShape))
                            }
                            Text(item.message, color = Muted, fontSize = 12.sp, lineHeight = 18.sp)
                            Text(item.createdAt.take(16).replace('T', ' '), color = Muted.copy(.75f), fontSize = 10.sp)
                        }
                    }
                }
            }
        }
        if (reminders.any { !it.completed }) {
            item {
                Text(
                    "Upcoming scheduled reminders",
                    Modifier.padding(start = 16.dp, top = 18.dp, bottom = 8.dp),
                    fontWeight = FontWeight.ExtraBold,
                    color = Ink
                )
            }
            items(reminders.filter { !it.completed }.take(5), key = { "scheduled_${it.id}" }) { reminder ->
                AppCardContainer(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Schedule, null, tint = Blue)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(reminder.title, fontWeight = FontWeight.Bold, color = Ink)
                            Text("${reminder.date} • ${reminder.time}", color = Muted, fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AddReminderDialog(onDismiss: () -> Unit, onSave: (ReminderEntity) -> Unit) {
    val context = LocalContext.current
    var title by remember { mutableStateOf("") }
    var date by remember { mutableStateOf(LocalDate.now()) }
    var time by remember { mutableStateOf(LocalTime.of(20, 30)) }
    val displayDate = date.format(DateTimeFormatter.ofPattern("dd MMM yyyy"))
    val displayTime = time.format(DateTimeFormatter.ofPattern("hh:mm a", Locale.US))

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add Reminder", fontWeight = FontWeight.ExtraBold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Title") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(14.dp)
                )
                OutlinedButton(
                    onClick = {
                        DatePickerDialog(
                            context,
                            { _, year, month, day -> date = LocalDate.of(year, month + 1, day) },
                            date.year,
                            date.monthValue - 1,
                            date.dayOfMonth
                        ).show()
                    },
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.CalendarMonth, null)
                    Spacer(Modifier.width(8.dp))
                    Text(displayDate)
                }
                OutlinedButton(
                    onClick = {
                        TimePickerDialog(
                            context,
                            { _, hour, minute -> time = LocalTime.of(hour, minute) },
                            time.hour,
                            time.minute,
                            false
                        ).show()
                    },
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Icon(Icons.Default.Schedule, null)
                    Spacer(Modifier.width(8.dp))
                    Text(displayTime)
                }
                Text("Notification will appear at the selected date and time.", color = Muted, fontSize = 11.sp)
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    onSave(ReminderEntity(title = title.trim(), date = date.toString(), time = displayTime))
                },
                enabled = title.isNotBlank()
            ) { Text("Save") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
}

@Composable
private fun NotesScreen(
    notes: List<NoteEntity>,
    onAdd: (NoteEntity) -> Unit,
    onPin: (NoteEntity) -> Unit,
    onDelete: (NoteEntity) -> Unit
) {
    var showAdd by remember { mutableStateOf(false) }
    var query by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("All") }
    var openedNote by remember { mutableStateOf<NoteEntity?>(null) }
    var deleteCandidate by remember { mutableStateOf<NoteEntity?>(null) }
    val visibleNotes = remember(notes, query, filter) {
        notes.filter { item ->
            val matchesSearch = query.isBlank() || item.title.contains(query, true) || item.body.contains(query, true)
            val matchesFilter = when (filter) {
                "Pinned" -> item.pinned
                "Recent" -> !item.pinned
                else -> true
            }
            matchesSearch && matchesFilter
        }
    }
    Column(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        AppHeader("Notes")
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            leadingIcon = { Icon(Icons.Default.Search, null, tint = Blue) },
            trailingIcon = {
                if (query.isNotBlank()) IconButton(onClick = { query = "" }) { Icon(Icons.Default.Close, "Clear search") }
            },
            placeholder = { Text("Search your notes") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            shape = RoundedCornerShape(18.dp),
            colors = OutlinedTextFieldDefaults.colors(unfocusedContainerColor = Color.White, focusedContainerColor = Color.White)
        )
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            listOf("All", "Pinned", "Recent").forEach { option ->
                FilterChip(
                    selected = filter == option,
                    onClick = { filter = option },
                    label = { Text(option) },
                    leadingIcon = if (option == "Pinned") {{ Icon(Icons.Default.PushPin, null, Modifier.size(15.dp)) }} else null
                )
            }
            Spacer(Modifier.weight(1f))
            Text("${visibleNotes.size} notes", color = Muted, fontSize = 11.sp, modifier = Modifier.align(Alignment.CenterVertically))
        }
        Spacer(Modifier.height(10.dp))
        Box(Modifier.weight(1f)) {
            if (visibleNotes.isEmpty()) {
                Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Surface(Modifier.size(76.dp), CircleShape, color = Blue.copy(.09f)) {
                        Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.NoteAlt, null, tint = Blue, modifier = Modifier.size(36.dp)) }
                    }
                    Spacer(Modifier.height(14.dp))
                    Text(if (query.isBlank()) "No notes yet" else "No matching notes", fontWeight = FontWeight.ExtraBold, color = Ink)
                    Text("Tap + to capture an idea or important detail.", color = Muted, fontSize = 12.sp)
                }
            } else {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 92.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    gridItems(visibleNotes, key = { it.id }) { item ->
                        val color = NotePalette[item.colorIndex.coerceIn(NotePalette.indices)]
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = color),
                            elevation = CardDefaults.cardElevation(1.dp),
                            modifier = Modifier.fillMaxWidth().heightIn(min = 190.dp).pointerInput(item.id) {
                                detectTapGestures(
                                    onTap = { openedNote = item },
                                    onLongPress = { deleteCandidate = item }
                                )
                            }
                        ) {
                            Column(Modifier.fillMaxSize().padding(15.dp)) {
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Surface(shape = RoundedCornerShape(9.dp), color = Color.White.copy(.55f)) {
                                        Text(if (item.pinned) "PINNED" else item.template.uppercase(), Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontSize = 8.sp, fontWeight = FontWeight.ExtraBold, color = Ink)
                                    }
                                    Spacer(Modifier.weight(1f))
                                    IconButton(onClick = { onPin(item) }, modifier = Modifier.size(30.dp)) {
                                        Icon(Icons.Default.PushPin, "Pin note", tint = if (item.pinned) Blue else Muted, modifier = Modifier.size(19.dp))
                                    }
                                }
                                Spacer(Modifier.height(10.dp))
                                Text(item.title, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = Ink, maxLines = 2)
                                Spacer(Modifier.height(7.dp))
                                Text(item.body.ifBlank { "No additional details" }, color = Ink.copy(.7f), fontSize = 12.sp, lineHeight = 18.sp, maxLines = 6, modifier = Modifier.weight(1f, fill = false))
                                Spacer(Modifier.height(16.dp))
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Text(item.createdAt, Modifier.weight(1f), fontSize = 10.sp, color = Ink.copy(.55f))
                                    Text("Hold to manage", fontSize = 9.sp, color = Ink.copy(.45f))
                                }
                            }
                        }
                    }
                }
            }
            FloatingActionButton(
                onClick = { showAdd = true },
                containerColor = Blue,
                contentColor = Color.White,
                shape = CircleShape,
                modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp).size(64.dp)
            ) { Icon(Icons.Default.Add, "Add note", modifier = Modifier.size(30.dp)) }
        }
    }
    if (showAdd) {
        AddNoteDialog(onDismiss = { showAdd = false }) { name, detail, colorIndex, template ->
            onAdd(NoteEntity(title = name, body = detail, createdAt = LocalDate.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy")), colorIndex = colorIndex, template = template))
            showAdd = false
        }
    }
    openedNote?.let { item ->
        AlertDialog(
            onDismissRequest = { openedNote = null },
            icon = { Icon(Icons.Default.NoteAlt, null, tint = Blue) },
            title = { Text(item.title, fontWeight = FontWeight.ExtraBold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = RoundedCornerShape(9.dp), color = NotePalette[item.colorIndex.coerceIn(NotePalette.indices)]) {
                            Text(item.template.uppercase(), Modifier.padding(horizontal = 9.dp, vertical = 5.dp), fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.weight(1f))
                        Text(item.createdAt, fontSize = 11.sp, color = Muted)
                    }
                    SelectionContainer { Text(item.body.ifBlank { "No additional details" }, color = Ink, fontSize = 15.sp, lineHeight = 23.sp) }
                }
            },
            confirmButton = { Button(onClick = { openedNote = null }) { Text("Close") } },
            dismissButton = { TextButton(onClick = { onPin(item); openedNote = null }) { Text(if (item.pinned) "Unpin" else "Pin") } }
        )
    }
    deleteCandidate?.let { item ->
        AlertDialog(
            onDismissRequest = { deleteCandidate = null },
            icon = { Icon(Icons.Default.DeleteOutline, null, tint = Red) },
            title = { Text("Delete this note?") },
            text = { Text("${item.title} will be permanently removed. You can cancel to keep it.") },
            confirmButton = { Button(onClick = { onDelete(item); deleteCandidate = null }, colors = ButtonDefaults.buttonColors(containerColor = Red)) { Text("Delete") } },
            dismissButton = { TextButton(onClick = { deleteCandidate = null }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun AddNoteDialog(onDismiss: () -> Unit, onSave: (String, String, Int, String) -> Unit) {
    var title by remember { mutableStateOf("") }
    var body by remember { mutableStateOf("") }
    var colorIndex by remember { mutableIntStateOf(0) }
    var template by remember { mutableStateOf("Blank") }
    val templates = linkedMapOf(
        "Blank" to "",
        "To-do" to "☐ Task 1\n☐ Task 2\n☐ Task 3",
        "Shopping" to "• Item 1\n• Item 2\n• Item 3",
        "Budget" to "Budget:\nSpent:\nRemaining:",
        "Ideas" to "Idea:\nWhy it matters:\nNext step:"
    )
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Create a note", fontWeight = FontWeight.ExtraBold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Template", fontWeight = FontWeight.Bold, color = Ink, fontSize = 12.sp)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    templates.keys.take(3).forEach { option ->
                        FilterChip(selected = template == option, onClick = { template = option; body = templates[option].orEmpty() }, label = { Text(option, fontSize = 10.sp) })
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    templates.keys.drop(3).forEach { option ->
                        FilterChip(selected = template == option, onClick = { template = option; body = templates[option].orEmpty() }, label = { Text(option, fontSize = 10.sp) })
                    }
                }
                Text("Card colour", fontWeight = FontWeight.Bold, color = Ink, fontSize = 12.sp)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    NotePalette.forEachIndexed { index, color ->
                        Surface(
                            modifier = Modifier.size(if (colorIndex == index) 38.dp else 32.dp).clickable { colorIndex = index },
                            shape = CircleShape,
                            color = color,
                            border = if (colorIndex == index) androidx.compose.foundation.BorderStroke(3.dp, Blue) else null
                        ) {}
                    }
                }
                OutlinedTextField(title, { title = it }, label = { Text("Title") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                OutlinedTextField(body, { body = it }, label = { Text("Note") }, minLines = 5, modifier = Modifier.fillMaxWidth())
            }
        },
        confirmButton = { Button(onClick = { onSave(title.trim(), body.trim(), colorIndex, template) }, enabled = title.isNotBlank()) { Text("Save note") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } }
    )
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
private fun SettingsScreen(
    darkMode: Boolean,
    biometricEnabled: Boolean,
    onDarkModeChange: (Boolean) -> Unit,
    onBiometricChange: (Boolean) -> Unit
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("daily_hisab_settings", 0) }
    var currency by remember { mutableStateOf(prefs.getString("currency", "BDT") ?: "BDT") }
    var notifications by remember { mutableStateOf(prefs.getBoolean("notifications", true)) }
    var notificationSound by remember { mutableStateOf(prefs.getBoolean("notification_sound", true)) }
    var notificationMessage by remember { mutableStateOf("") }
    val notificationPermission = androidx.activity.compose.rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        notifications = granted
        prefs.edit().putBoolean("notifications", granted).apply()
        notificationMessage = if (granted) "Notifications enabled" else "Notification permission was denied"
        if (granted) DailyInsightWorker.schedule(context)
    }
    val bangla = useBangla
    LazyColumn(Modifier.fillMaxSize()) {
        item { AppHeader("Settings") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Text(if (bangla) "মুদ্রা" else "Currency", fontWeight = FontWeight.Bold, color = Ink)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf("BDT", "USD", "USDT").forEachIndexed { index, value ->
                        SegmentedButton(
                            selected = currency == value,
                            onClick = {
                                currency = value
                                selectedCurrency = value
                                prefs.edit().putString("currency", value).apply()
                            },
                            shape = SegmentedButtonDefaults.itemShape(index, 3)
                        ) { Text(value) }
                    }
                }
                Text(if (bangla) "ভাষা" else "Language", fontWeight = FontWeight.Bold, color = Ink)
                SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                    listOf(false to "English", true to "বাংলা").forEachIndexed { index, (isBangla, label) ->
                        SegmentedButton(
                            selected = bangla == isBangla,
                            onClick = {
                                useBangla = isBangla
                                prefs.edit().putString("language", if (isBangla) "Bangla" else "English").apply()
                            },
                            shape = SegmentedButtonDefaults.itemShape(index, 2)
                        ) { Text(label) }
                    }
                }
                AppCard {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Notifications, null, tint = Orange)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(if (bangla) "নোটিফিকেশন" else "Notifications", fontWeight = FontWeight.Bold, color = Ink)
                            Text(if (bangla) "খরচ ও পেমেন্টের রিমাইন্ডার" else "Expense and payment reminders", fontSize = 11.sp, color = Muted)
                        }
                        Switch(
                            checked = notifications,
                            onCheckedChange = { enabled ->
                                if (enabled && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                                    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                                ) {
                                    notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
                                } else {
                                    notifications = enabled
                                    prefs.edit().putBoolean("notifications", enabled).apply()
                                    notificationMessage = if (enabled) "Notifications enabled" else "Notifications disabled"
                                    if (!enabled) {
                                        ReminderWorker.cancelAll(context)
                                        DailyInsightWorker.cancel(context)
                                    } else {
                                        DailyInsightWorker.schedule(context)
                                    }
                                }
                            }
                        )
                    }
                    if (notificationMessage.isNotBlank()) Text(notificationMessage, fontSize = 11.sp, color = Muted)
                    HorizontalDivider(Modifier.padding(vertical = 12.dp))
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (notificationSound) Icons.Default.VolumeUp else Icons.Default.VolumeOff, null, tint = Blue)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(if (bangla) "নোটিফিকেশন সাউন্ড" else "Notification sound", fontWeight = FontWeight.Bold, color = Ink)
                            Text(if (notificationSound) "Sound and vibration enabled" else "Notifications will be silent", fontSize = 11.sp, color = Muted)
                        }
                        Switch(
                            checked = notificationSound,
                            enabled = notifications,
                            onCheckedChange = {
                                notificationSound = it
                                prefs.edit().putBoolean("notification_sound", it).apply()
                                notificationMessage = if (it) "Notification sound enabled" else "Notifications set to silent"
                            }
                        )
                    }
                }
                AppCard {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Fingerprint, null, tint = Blue)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(if (bangla) "বায়োমেট্রিক লক" else "Biometric lock", fontWeight = FontWeight.Bold, color = Ink)
                            Text(if (bangla) "ফিঙ্গারপ্রিন্ট দিয়ে অ্যাপ আনলক করুন" else "Use fingerprint or screen lock to unlock", fontSize = 11.sp, color = Muted)
                        }
                        Switch(checked = biometricEnabled, onCheckedChange = onBiometricChange)
                    }
                }
                AppCard {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Icon(if (darkMode) Icons.Default.DarkMode else Icons.Default.LightMode, null, tint = Blue)
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(if (bangla) "ডার্ক মোড" else "Dark mode", fontWeight = FontWeight.Bold)
                            Text(if (bangla) "লাইট ও ডার্ক থিম পরিবর্তন করুন" else "Switch between light and dark appearance", fontSize = 11.sp, color = Muted)
                        }
                        Switch(darkMode, onDarkModeChange)
                    }
                }
                Text(if (bangla) "সেটিংস এই ডিভাইসে স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়।" else "Settings are saved automatically on this device.", color = Muted, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun BackupScreen(
    expenses: List<Expense>,
    recurring: List<RecurringEntity>,
    reminders: List<ReminderEntity>,
    notes: List<NoteEntity>,
    categories: List<CategoryEntity>
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val database = remember { FinanceDatabase.get(context) }
    var status by remember { mutableStateOf("Ready to create a backup") }
    var automaticBackupEnabled by remember { mutableStateOf(AutomaticBackupWorker.isEnabled(context)) }
    var selectedInterval by remember { mutableLongStateOf(AutomaticBackupWorker.configuredIntervalDays(context)) }
    var configuredDriveUri by remember { mutableStateOf(AutomaticBackupWorker.configuredDriveUri(context)) }
    var pendingInterval by remember { mutableLongStateOf(selectedInterval) }
    val automaticBackupFile = remember { java.io.File(context.filesDir, "backups/daily-hisab-auto-backup.json") }
    val backupJson = remember(expenses, recurring, reminders, notes, categories) {
        JSONObject().apply {
            put("version", 2)
            put("createdAt", System.currentTimeMillis())
            put("transactions", JSONArray().apply { expenses.forEach { put(JSONObject().put("title", it.title).put("category", it.category).put("amount", it.amount).put("date", it.date).put("time", it.time).put("income", it.income).put("note", it.note)) } })
            put("recurring", JSONArray().apply { recurring.forEach { put(JSONObject().put("title", it.title).put("amount", it.amount).put("frequency", it.frequency).put("nextDueDate", it.nextDueDate)) } })
            put("reminders", JSONArray().apply { reminders.forEach { put(JSONObject().put("title", it.title).put("date", it.date).put("time", it.time).put("completed", it.completed)) } })
            put("notes", JSONArray().apply { notes.forEach { put(JSONObject().put("title", it.title).put("body", it.body).put("createdAt", it.createdAt).put("pinned", it.pinned).put("colorIndex", it.colorIndex).put("template", it.template)) } })
            put("categories", JSONArray().apply { categories.forEach { put(JSONObject().put("name", it.name).put("iconName", it.iconName)) } })
        }.toString(2)
    }
    fun restore(jsonText: String) {
        scope.launch {
            status = "Restoring backup…"
            runCatching { restoreBackup(database, jsonText) }
                .onSuccess { status = "Restore completed successfully" }
                .onFailure { status = "Restore failed: ${it.message}" }
        }
    }
    val createDocument = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) {
            runCatching { context.contentResolver.openOutputStream(uri)?.bufferedWriter()?.use { it.write(backupJson) } }
                .onSuccess { status = "Backup saved successfully" }
                .onFailure { status = "Backup failed: ${it.message}" }
        }
    }
    val openDocument = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            runCatching { context.contentResolver.openInputStream(uri)?.bufferedReader()?.use { it.readText() } ?: error("Empty backup") }
                .onSuccess(::restore)
                .onFailure { status = "Could not open backup: ${it.message}" }
        }
    }
    val configureDriveDocument = androidx.activity.compose.rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) {
            runCatching {
                context.contentResolver.takePersistableUriPermission(
                    uri,
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
                context.contentResolver.openOutputStream(uri, "wt")?.bufferedWriter()?.use { it.write(backupJson) }
                    ?: error("Could not write the Drive backup")
                AutomaticBackupWorker.configureDrive(context, uri.toString(), pendingInterval)
            }.onSuccess {
                selectedInterval = pendingInterval
                configuredDriveUri = uri.toString()
                automaticBackupEnabled = true
                status = "Automatic Drive backup is active every $pendingInterval day${if (pendingInterval == 1L) "" else "s"}"
            }.onFailure { status = "Drive setup failed: ${it.message}" }
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
                        Icon(Icons.Default.CloudUpload, null); Spacer(Modifier.width(8.dp)); Text("Save to Drive / device")
                    }
                    Spacer(Modifier.height(9.dp))
                    OutlinedButton(onClick = { openDocument.launch(arrayOf("application/json", "text/plain")) }, modifier = Modifier.fillMaxWidth()) {
                        Icon(Icons.Default.Restore, null); Spacer(Modifier.width(8.dp)); Text("Restore JSON backup")
                    }
                }
                AppCard {
                    Text("Backup includes", fontWeight = FontWeight.Bold, color = Ink)
                    Text("• ${expenses.size} transactions\n• ${categories.size} categories\n• ${recurring.size} recurring expenses\n• ${reminders.size} reminders\n• ${notes.size} notes", color = Muted, lineHeight = 24.sp)
                }
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Backup, null, tint = Green)
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Automatic backup", fontWeight = FontWeight.ExtraBold, color = Ink)
                            Text(
                                if (automaticBackupEnabled) "On • every $selectedInterval day${if (selectedInterval == 1L) "" else "s"}" else "Off • no scheduled backup will run",
                                color = if (automaticBackupEnabled) Green else Muted,
                                fontSize = 11.sp
                            )
                        }
                        Switch(
                            checked = automaticBackupEnabled,
                            onCheckedChange = { enabled ->
                                automaticBackupEnabled = enabled
                                AutomaticBackupWorker.setEnabled(context, enabled)
                                status = if (enabled) "Automatic backup enabled" else "Automatic backup disabled"
                            }
                        )
                    }
                    if (automaticBackupFile.exists()) {
                        Spacer(Modifier.height(10.dp))
                        OutlinedButton(
                            onClick = { runCatching { automaticBackupFile.readText() }.onSuccess(::restore).onFailure { status = "Restore failed: ${it.message}" } },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.History, null); Spacer(Modifier.width(8.dp)); Text("Restore latest automatic backup")
                        }
                    }
                }
                AppCard {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.AddToDrive, null, tint = Blue, modifier = Modifier.size(34.dp))
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Automatic Google Drive backup", fontWeight = FontWeight.ExtraBold, color = Ink)
                            Text(
                                if (configuredDriveUri != null && automaticBackupEnabled) "Active • every $selectedInterval day${if (selectedInterval == 1L) "" else "s"}" else if (configuredDriveUri != null) "Configured • currently off" else "Choose an interval and Drive file once",
                                color = if (configuredDriveUri != null && automaticBackupEnabled) Green else Muted,
                                fontSize = 11.sp
                            )
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    Text("Backup interval", color = Muted, fontSize = 11.sp)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(1L to "1 day", 7L to "7 days", 30L to "30 days").forEach { (days, label) ->
                            FilterChip(
                                selected = selectedInterval == days,
                                onClick = {
                                    selectedInterval = days
                                    AutomaticBackupWorker.setInterval(context, days)
                                    status = if (automaticBackupEnabled) "Backup interval changed to $label" else "Interval saved; turn automatic backup on to use it"
                                },
                                label = { Text(label) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = {
                            pendingInterval = selectedInterval
                            configureDriveDocument.launch("daily-hisab-auto-backup.json")
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Default.Sync, null)
                        Spacer(Modifier.width(8.dp))
                        Text(if (configuredDriveUri == null) "Select Drive & enable" else "Change Drive / interval")
                    }
                    if (configuredDriveUri != null) {
                        Spacer(Modifier.height(8.dp))
                        OutlinedButton(
                            onClick = {
                                runCatching {
                                    context.contentResolver.openInputStream(Uri.parse(configuredDriveUri))
                                        ?.bufferedReader()?.use { it.readText() } ?: error("Drive backup is unavailable")
                                }.onSuccess(::restore).onFailure { status = "Drive restore failed: ${it.message}" }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Default.Restore, null)
                            Spacer(Modifier.width(8.dp))
                            Text("Restore automatic Drive backup")
                        }
                        TextButton(
                            onClick = {
                                AutomaticBackupWorker.disableDrive(context)
                                configuredDriveUri = null
                                status = "Automatic Drive backup disabled"
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) { Text("Disable automatic Drive backup", color = Red) }
                    }
                }
                Text("Choose Google Drive in the Android file picker to keep an online copy. Daily automatic backups are kept securely inside the app.", color = Muted, fontSize = 12.sp)
            }
        }
    }
}

private suspend fun restoreBackup(database: FinanceDatabase, jsonText: String) {
    val root = JSONObject(jsonText)
    require(root.has("transactions")) { "Invalid Daily Hisab backup" }
    val transactions = root.optJSONArray("transactions") ?: JSONArray()
    val recurring = root.optJSONArray("recurring") ?: JSONArray()
    val reminders = root.optJSONArray("reminders") ?: JSONArray()
    val notes = root.optJSONArray("notes") ?: JSONArray()
    val categories = root.optJSONArray("categories") ?: JSONArray()

    database.withTransaction {
        database.transactionDao().clearAll()
        database.recurringDao().clearAll()
        database.reminderDao().clearAll()
        database.noteDao().clearAll()
        if (categories.length() > 0) database.categoryDao().clearAll()

        for (index in 0 until transactions.length()) {
        val item = transactions.getJSONObject(index)
        database.transactionDao().insert(
            TransactionEntity(
                title = item.optString("title", "Expense"),
                category = item.optString("category", "Others"),
                amount = item.optInt("amount"),
                date = item.optString("date", LocalDate.now().toString()),
                time = item.optString("time", ""),
                type = if (item.optBoolean("income")) "income" else "expense",
                note = item.optString("note", "")
            )
        )
        }
        for (index in 0 until recurring.length()) {
        val item = recurring.getJSONObject(index)
        database.recurringDao().insert(RecurringEntity(title = item.optString("title"), amount = item.optInt("amount"), frequency = item.optString("frequency", "Monthly"), nextDueDate = item.optString("nextDueDate")))
        }
        for (index in 0 until reminders.length()) {
        val item = reminders.getJSONObject(index)
        database.reminderDao().insert(ReminderEntity(title = item.optString("title"), date = item.optString("date"), time = item.optString("time"), completed = item.optBoolean("completed")))
        }
        for (index in 0 until notes.length()) {
        val item = notes.getJSONObject(index)
        database.noteDao().insert(NoteEntity(title = item.optString("title"), body = item.optString("body"), createdAt = item.optString("createdAt"), pinned = item.optBoolean("pinned"), colorIndex = item.optInt("colorIndex", 0), template = item.optString("template", "Blank")))
        }
        for (index in 0 until categories.length()) {
        val item = categories.getJSONObject(index)
        database.categoryDao().insert(CategoryEntity(name = item.optString("name"), iconName = item.optString("iconName", "other")))
        }
    }
}

@Composable
private fun ProfileScreen(name: String, photo: String, onNameChange: (String) -> Unit, onPhotoChange: (String) -> Unit, onNavigate: (Screen) -> Unit, onSignOut: () -> Unit) {
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
                Text(if (useBangla) "পছন্দসমূহ" else "Preferences", fontWeight = FontWeight.Bold, color = Ink)
                Text(if (useBangla) "টুলস" else "Tools", fontWeight = FontWeight.Bold, color = Ink)
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
                    SettingsRow(Icons.Default.CurrencyExchange, "Currency", selectedCurrency) { onNavigate(Screen.Settings) }
                    SettingsRow(Icons.Default.Language, if (useBangla) "ভাষা" else "Language", if (useBangla) "বাংলা" else "English") { onNavigate(Screen.Settings) }
                    SettingsRow(Icons.Default.Notifications, "Notifications", "Manage alerts and reminders") { onNavigate(Screen.Settings) }
                    SettingsRow(Icons.Default.Fingerprint, "Biometric Lock", "Use fingerprint to unlock") { onNavigate(Screen.Settings) }
                    SettingsRow(Icons.Default.DarkMode, "Appearance", "Light and dark mode") { onNavigate(Screen.Settings) }
                }
                Text("Data & Privacy", fontWeight = FontWeight.Bold, color = Ink)
                AppCard {
                    SettingsRow(Icons.Default.Storage, "Data Management", "Export or back up your data") { onNavigate(Screen.Backup) }
                    SettingsRow(Icons.Default.PrivacyTip, "Privacy Policy", "Read our privacy policy") { onNavigate(Screen.Privacy) }
                    SettingsRow(Icons.Default.Help, "Help & Support", "Get help and contact support") { onNavigate(Screen.Help) }
                }
                OutlinedButton(
                    onClick = onSignOut,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Red)
                ) {
                    Icon(Icons.Default.Logout, null)
                    Spacer(Modifier.width(8.dp))
                    Text("Log out")
                }
            }
        }
    }
}

@Composable
private fun PrivacyPolicyScreen() {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 28.dp)) {
        item { AppHeader("Privacy Policy") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(
                        Modifier.fillMaxWidth()
                            .background(Brush.linearGradient(listOf(Navy, Blue, Color(0xFF315BD7))))
                            .padding(22.dp)
                    ) {
                        Icon(Icons.Default.PrivacyTip, null, tint = Color.White, modifier = Modifier.size(36.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("Your data. Your control.", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                        Text("Daily Hisab is designed to keep your financial information private and protected.", color = Color.White.copy(.8f), fontSize = 12.sp)
                    }
                }
                PrivacySection("Information we use", "Your account name, email address, profile photo, expense records, categories, budgets, reminders, notes and receipt references are used only to provide app features.")
                PrivacySection("Storage and security", "Finance records are stored in the app database on your device. Firebase Authentication is used for secure account sign-in. Biometric lock data is verified by Android and is never collected by Daily Hisab.")
                PrivacySection("Notifications", "If enabled, Daily Hisab schedules reminder and budget notifications on your device. You can disable them at any time from Settings.")
                PrivacySection("Photos and receipts", "The app accesses only the images you explicitly select. Receipt images remain under your device storage permissions.")
                PrivacySection("Sharing and selling", "We do not sell your personal or financial information. Data is not shared with advertisers.")
                PrivacySection("Your choices", "You can edit or delete entries, export a backup, disable notifications and biometric lock, or remove the app and its local data.")
                PrivacySection("Contact", "Questions about privacy can be sent to mirza.galib.palash@gmail.com.")
                Text("Effective date: 30 July 2026", color = Muted, fontSize = 11.sp)
            }
        }
    }
}

@Composable
private fun PrivacySection(title: String, body: String) {
    AppCard {
        Text(title, fontWeight = FontWeight.ExtraBold, color = Ink)
        Spacer(Modifier.height(6.dp))
        Text(body, color = Muted, fontSize = 13.sp, lineHeight = 20.sp)
    }
}

@Composable
private fun HelpSupportScreen() {
    val context = LocalContext.current
    fun openUri(uri: String) {
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(uri))) }
    }

    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 28.dp)) {
        item { AppHeader("Help & Support") }
        item {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(
                        Modifier.fillMaxWidth()
                            .background(Brush.linearGradient(listOf(Color(0xFF4C1D95), Blue, Color(0xFF0EA5E9))))
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Surface(Modifier.size(76.dp), CircleShape, color = Color.White.copy(.16f)) {
                            Box(contentAlignment = Alignment.Center) { Icon(Icons.Default.Code, null, tint = Color.White, modifier = Modifier.size(38.dp)) }
                        }
                        Spacer(Modifier.height(14.dp))
                        Text("Mirza Galib Palash", color = Color.White, fontSize = 23.sp, fontWeight = FontWeight.ExtraBold)
                        Text("Developer of Daily Hisab", color = Color.White.copy(.8f), fontSize = 13.sp)
                        Text("Building simple tools for smarter financial habits.", color = Color.White.copy(.72f), fontSize = 11.sp)
                    }
                }
                AppCard {
                    Text("Need help?", color = Ink, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                    Text("Report a problem, suggest a feature, or ask anything about Daily Hisab.", color = Muted, fontSize = 13.sp)
                    Spacer(Modifier.height(16.dp))
                    Button(
                        onClick = { openUri("mailto:mirza.galib.palash@gmail.com?subject=Daily%20Hisab%20Support") },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.Email, null)
                        Spacer(Modifier.width(9.dp))
                        Text("mirza.galib.palash@gmail.com")
                    }
                    Spacer(Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = { openUri("https://mirzagalib.xyz") },
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Icon(Icons.Default.Language, null)
                        Spacer(Modifier.width(9.dp))
                        Text("Visit Developer Portfolio")
                    }
                }
                AppCard {
                    Text("Quick help", fontWeight = FontWeight.ExtraBold, color = Ink)
                    Text("• Enable notifications from Settings and allow Android permission.\n• Reminder notifications use the date and time you select.\n• The automatic daily check runs around 8:30 PM.\n• Use Backup to export a copy of your records.", color = Muted, fontSize = 12.sp, lineHeight = 21.sp)
                }
            }
        }
    }
}

@Composable
private fun AuthScreen(auth: FirebaseAuth) {
    val context = LocalContext.current
    var createAccount by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }

    fun friendlyError(message: String?): String = when {
        message.isNullOrBlank() -> "Something went wrong. Please try again."
        "blocked all requests" in message.lowercase() || "unusual activity" in message.lowercase() ->
            "Firebase temporarily paused requests from this device. Wait a few minutes, then try again."
        "too many" in message.lowercase() ->
            "Too many attempts. Wait a few minutes, then try again."
        "password" in message.lowercase() -> "Password must be at least 6 characters."
        "email address is already" in message.lowercase() -> "An account already exists with this email."
        "credential is incorrect" in message.lowercase() -> "Email or password is incorrect."
        else -> message
    }

    val googleLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode != android.app.Activity.RESULT_OK) {
            loading = false
            if (result.data != null) error = "Google sign-in was not completed."
            return@rememberLauncherForActivityResult
        }
        runCatching { GoogleSignIn.getSignedInAccountFromIntent(result.data).result }
            .onSuccess { account ->
                val token = account.idToken
                if (token == null) {
                    loading = false
                    error = "Google sign-in configuration is incomplete."
                } else {
                    auth.signInWithCredential(GoogleAuthProvider.getCredential(token, null))
                        .addOnFailureListener {
                            loading = false
                            error = friendlyError(it.message)
                        }
                }
            }
            .onFailure {
                loading = false
                error = friendlyError(it.message)
            }
    }

    fun submitEmail() {
        error = ""
        when {
            email.isBlank() -> error = "Enter your email address."
            password.length < 6 -> error = "Password must be at least 6 characters."
            createAccount && name.isBlank() -> error = "Enter your name."
            else -> {
                loading = true
                if (createAccount) {
                    auth.createUserWithEmailAndPassword(email.trim(), password)
                        .addOnSuccessListener { result ->
                            result.user?.updateProfile(
                                UserProfileChangeRequest.Builder().setDisplayName(name.trim()).build()
                            )
                            result.user?.sendEmailVerification()
                            loading = false
                        }
                        .addOnFailureListener { exception ->
                            if (exception is FirebaseAuthUserCollisionException) {
                                // A previous registration may have completed before the UI received
                                // the auth-state update. Reusing the same credentials should sign the
                                // user in instead of leaving them stuck on an "already exists" error.
                                auth.signInWithEmailAndPassword(email.trim(), password)
                                    .addOnSuccessListener { loading = false }
                                    .addOnFailureListener {
                                        loading = false
                                        createAccount = false
                                        error = "This email already has an account. Log in with its password or use Forgot password."
                                    }
                            } else {
                                loading = false
                                error = friendlyError(exception.message)
                            }
                        }
                } else {
                    auth.signInWithEmailAndPassword(email.trim(), password)
                        .addOnFailureListener {
                            loading = false
                            error = friendlyError(it.message)
                        }
                }
            }
        }
    }

    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Color(0xFFF4F6FF), Color.White))
        )
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            item {
                Surface(Modifier.size(72.dp), RoundedCornerShape(22.dp), color = Blue) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.AccountBalanceWallet, null, tint = Color.White, modifier = Modifier.size(38.dp))
                    }
                }
                Spacer(Modifier.height(16.dp))
                Text("Daily hisab", color = Navy, fontSize = 30.sp, fontWeight = FontWeight.ExtraBold)
                Text(if (createAccount) "Create your account" else "Welcome back", color = Muted)
                Spacer(Modifier.height(28.dp))
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(4.dp)
                ) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        if (createAccount) {
                            OutlinedTextField(
                                value = name,
                                onValueChange = { name = it },
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Full name") },
                                leadingIcon = { Icon(Icons.Default.Person, null) },
                                singleLine = true
                            )
                        }
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Email") },
                            leadingIcon = { Icon(Icons.Default.Email, null) },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Password") },
                            leadingIcon = { Icon(Icons.Default.Lock, null) },
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            singleLine = true
                        )
                        if (error.isNotBlank()) Text(error, color = Red, fontSize = 13.sp)
                        Button(
                            onClick = { submitEmail() },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !loading,
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            if (loading) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                            else Text(if (createAccount) "Create account" else "Log in", fontWeight = FontWeight.Bold)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            HorizontalDivider(Modifier.weight(1f))
                            Text("  or  ", color = Muted, fontSize = 12.sp)
                            HorizontalDivider(Modifier.weight(1f))
                        }
                        OutlinedButton(
                            onClick = {
                                error = ""
                                loading = true
                                val options = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                                    .requestIdToken(context.getString(com.dailyhisab.nativeapp.R.string.default_web_client_id))
                                    .requestEmail()
                                    .build()
                                val client = GoogleSignIn.getClient(context, options)
                                client.signOut().addOnCompleteListener { googleLauncher.launch(client.signInIntent) }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !loading,
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Default.GMobiledata, null, tint = Blue, modifier = Modifier.size(28.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Continue with Google", color = Ink, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                TextButton(onClick = {
                    createAccount = !createAccount
                    error = ""
                }) {
                    Text(if (createAccount) "Already have an account? Log in" else "New here? Create an account")
                }
                if (!createAccount) {
                    TextButton(
                        onClick = {
                            if (email.isBlank()) error = "Enter your email first."
                            else {
                                auth.sendPasswordResetEmail(email.trim())
                                    .addOnSuccessListener { error = "Password reset email sent." }
                                    .addOnFailureListener { error = friendlyError(it.message) }
                            }
                        }
                    ) { Text("Forgot password?") }
                }
                Spacer(Modifier.height(20.dp))
            }
        }
    }
}

@Composable
private fun EmailVerificationScreen(
    user: FirebaseUser,
    onVerified: () -> Unit,
    onSignOut: () -> Unit
) {
    var loading by remember { mutableStateOf(false) }
    var resendCooldown by remember { mutableIntStateOf(60) }
    var message by remember {
        mutableStateOf("We sent a verification link to ${user.email.orEmpty()}. Open Gmail and tap the link.")
    }
    var isError by remember { mutableStateOf(false) }

    LaunchedEffect(resendCooldown) {
        if (resendCooldown > 0) {
            delay(1_000)
            resendCooldown--
        }
    }

    Box(
        Modifier.fillMaxSize().background(
            Brush.verticalGradient(listOf(Color(0xFFF4F6FF), Color.White))
        ),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier.fillMaxWidth().padding(24.dp),
            shape = RoundedCornerShape(26.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(5.dp)
        ) {
            Column(
                Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Surface(Modifier.size(70.dp), CircleShape, color = Blue.copy(.1f)) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.MarkEmailUnread, null, tint = Blue, modifier = Modifier.size(38.dp))
                    }
                }
                Text("Verify your email", color = Navy, fontSize = 25.sp, fontWeight = FontWeight.ExtraBold)
                Text(
                    message,
                    color = if (isError) Red else Muted,
                    fontSize = 14.sp
                )
                Button(
                    onClick = {
                        loading = true
                        user.reload()
                            .addOnSuccessListener {
                                loading = false
                                if (user.isEmailVerified) {
                                    onVerified()
                                } else {
                                    isError = true
                                    message = "Email is not verified yet. Open the email link, then check again."
                                }
                            }
                            .addOnFailureListener {
                                loading = false
                                isError = true
                                message = it.message ?: "Could not check verification. Try again."
                            }
                    },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    enabled = !loading,
                    shape = RoundedCornerShape(14.dp)
                ) {
                    if (loading) CircularProgressIndicator(Modifier.size(22.dp), color = Color.White, strokeWidth = 2.dp)
                    else {
                        Icon(Icons.Default.Verified, null)
                        Spacer(Modifier.width(8.dp))
                        Text("I've verified — continue", fontWeight = FontWeight.Bold)
                    }
                }
                OutlinedButton(
                    onClick = {
                        loading = true
                        user.sendEmailVerification()
                            .addOnSuccessListener {
                                loading = false
                                resendCooldown = 60
                                isError = false
                                message = "A new verification email was sent to ${user.email.orEmpty()}."
                            }
                            .addOnFailureListener {
                                loading = false
                                isError = true
                                val blocked = it.message?.contains("blocked all requests", ignoreCase = true) == true ||
                                    it.message?.contains("unusual activity", ignoreCase = true) == true ||
                                    it.message?.contains("too many", ignoreCase = true) == true
                                if (blocked) {
                                    resendCooldown = 120
                                    message = "Too many emails were requested. Firebase temporarily paused this device. Wait a few minutes, then try again once."
                                } else {
                                    message = it.message ?: "Could not resend the email. Try again later."
                                }
                            }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !loading && resendCooldown == 0
                ) {
                    Icon(Icons.Default.Refresh, null)
                    Spacer(Modifier.width(8.dp))
                    Text(if (resendCooldown > 0) "Resend in ${resendCooldown}s" else "Resend verification email")
                }
                TextButton(onClick = onSignOut, enabled = !loading) {
                    Text("Use another account")
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
private fun SettingsRow(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
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
            Triple(Screen.Home, translated("Home"), Icons.Default.Home),
            Triple(Screen.Reports, translated("Reports"), Icons.Default.BarChart),
            Triple(Screen.Add, translated("Add"), Icons.Default.AddCircle),
            Triple(Screen.Calendar, translated("Calendar"), Icons.Default.CalendarMonth),
            Triple(Screen.Profile, translated("Profile"), Icons.Default.Person)
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
