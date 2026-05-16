// تحميل الإعدادات من config.json
let CONFIG = {};

async function loadConfig() {
    try {
        const response = await fetch('config.json');
        CONFIG = await response.json();
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// تهيئة الإعدادات
loadConfig();