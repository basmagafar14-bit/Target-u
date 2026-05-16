// المتغيرات العامة
let currentUser = null;
let isLoggedIn = false;
let isVipUser = false;
let isAdmin = false;

// التحقق من أول زيارة
function checkFirstVisit() {
    const hasVisited = localStorage.getItem('targetu_visited');
    if (hasVisited) {
        document.getElementById('welcomePage').classList.add('hidden');
        if (isLoggedIn) {
            document.getElementById('mainPage').classList.remove('hidden');
        } else {
            document.getElementById('authPage').classList.remove('hidden');
        }
    } else {
        document.getElementById('welcomePage').classList.remove('hidden');
    }
}

function proceedToLogin() {
    localStorage.setItem('targetu_visited', 'true');
    document.getElementById('welcomePage').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
}

// تبديل نماذج تسجيل الدخول
function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.querySelectorAll('.tab-btn')[1].classList.remove('active');
}

function showRegisterForm() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.querySelectorAll('.tab-btn')[0].classList.remove('active');
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
}

// معالجة تسجيل الدخول
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value;
    const password = document.getElementById('loginPassword').value;
    
    // التحقق من بيانات المدير
    if (phone === CONFIG.admin?.username && password === CONFIG.admin?.password) {
        isAdmin = true;
        currentUser = {
            phone: phone,
            name: 'Admin',
            isAdmin: true
        };
        isLoggedIn = true;
        document.getElementById('authPage').classList.add('hidden');
        document.getElementById('adminPage').classList.remove('hidden');
        loadAdminPanel();
        return;
    }
    
    // جلب المستخدمين المسجلين
    const users = await telegramDB.getData('users') || [];
    const user = users.find(u => u.phone === phone && u.password === password);
    
    if (user) {
        currentUser = user;
        isLoggedIn = true;
        isVipUser = user.isVip || false;
        document.getElementById('authPage').classList.add('hidden');
        document.getElementById('mainPage').classList.remove('hidden');
        updateUI();
    } else {
        alert('رقم الهاتف أو كلمة المرور غير صحيحة');
    }
});

// معالجة إنشاء الحساب
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const users = await telegramDB.getData('users') || [];
    
    // التحقق من وجود المستخدم
    const phone = document.getElementById('regPhone').value;
    if (users.find(u => u.phone === phone)) {
        alert('رقم الهاتف مسجل بالفعل');
        return;
    }
    
    const photoFile = document.getElementById('regPhoto').files[0];
    let photoUrl = 'assets/default-avatar.png';
    
    if (photoFile) {
        const result = await telegramDB.sendPhoto(photoFile);
        if (result?.result?.photo) {
            const photo = result.result.photo[result.result.photo.length - 1];
            photoUrl = `https://api.telegram.org/file/bot${CONFIG.telegram.token}/${photo.file_path}`;
        }
    }
    
    const newUser = {
        id: Date.now().toString(),
        name: document.getElementById('regName').value,
        age: document.getElementById('regAge').value,
        gender: document.getElementById('regGender').value,
        phone: phone,
        password: document.getElementById('regPassword').value,
        bio: document.getElementById('regBio').value,
        photo: photoUrl,
        isVip: false,
        createdAt: new Date().toISOString(),
        postsCount: 0,
        roomsCount: 0,
        subscribersCount: 0
    };
    
    users.push(newUser);
    await telegramDB.saveData('users', users);
    
    alert('تم إنشاء الحساب بنجاح');
    showLoginForm();
});

// إنشاء حساب مميز
async function createVipAccount(vipCode) {
    if (!CONFIG.vipCodes.includes(vipCode)) {
        alert('الرمز غير صحيح');
        return false;
    }
    
    const users = await telegramDB.getData('users') || [];
    const userIndex = users.findIndex(u => u.phone === currentUser.phone);
    
    if (userIndex !== -1) {
        users[userIndex].isVip = true;
        users[userIndex].vipCode = vipCode;
        await telegramDB.saveData('users', users);
        
        // إزالة الرمز المستخدم
        const codeIndex = CONFIG.vipCodes.indexOf(vipCode);
        if (codeIndex > -1) {
            CONFIG.vipCodes.splice(codeIndex, 1);
            // تحديث config.json عبر Telegram
            await telegramDB.saveData('vipCodes', CONFIG.vipCodes);
        }
        
        currentUser = users[userIndex];
        isVipUser = true;
        updateUI();
        return true;
    }
    return false;
}

function showVipRegistration() {
    const vipCode = prompt('أدخل الرمز الخاص لتفعيل الحساب المميز:');
    if (vipCode) {
        createVipAccount(vipCode).then(success => {
            if (success) {
                alert('تم تفعيل الحساب المميز بنجاح!');
            }
        });
    }
}

// تسجيل الخروج
function logout() {
    currentUser = null;
    isLoggedIn = false;
    isVipUser = false;
    isAdmin = false;
    document.getElementById('mainPage').classList.add('hidden');
    document.getElementById('adminPage').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
}