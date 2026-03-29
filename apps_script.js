// ============================================
// AdaTrust Lead Otomasyon - Google Apps Script
// ElevenLabs Conversational AI Entegrasyonu
// ============================================

// ---- AYARLAR ----
const CONFIG = {
  ELEVENLABS_API_KEY: 'sk_0d51695227fae84dc5fcdeef3f11576722b9015f39f6b118',
  AGENT_ID: 'agent_6001kmjcyzpwfzp89qrq5d1wpagt',
  PHONE_NUMBER_ID: 'phnum_8301kmjr58d6eh3822mjp6ta8ern',
  SPREADSHEET_ID: '18Hu6UgmSkZS0FVL0dadyay1trQwHSBbyh6blKaCI4wY',

  // Sheet isimleri (tam olarak Google Sheets'teki gibi)
  SHEETS: ['The Elysium Girne', 'Ada Trust Life'],

  // Arama saatleri (Türkiye saati, haftanın 7 günü)
  CALL_START_HOUR: 11,
  CALL_END_HOUR: 18,
  TIMEZONE: 'Europe/Istanbul',

  // Mevcut kolonlar (A-H) - DOKUNULMAYACAK
  // A: CREATED TIME
  // B: LEAD ID
  // C: ADI
  // D: SOYADI
  // E: TELEFON NUMARASI
  // F: EMAIL
  // G: ÜLKE
  // H: SÜREÇ (mevcut notlar)

  // Otomasyon kolonları (I-M) - YENİ EKLENECEK
  COL_BOT_STATUS: 9,       // I: Bot Durumu (yeni/araniyor/gorusuldu/ulasilamadi/pasif/satisa_aktarildi)
  COL_CALL_COUNT: 10,      // J: Arama Sayısı
  COL_NEXT_CALL: 11,       // K: Sonraki Arama
  COL_CONVERSATION_ID: 12, // L: Conversation ID
  COL_BOT_NOTLAR: 13,      // M: Bot Notları (görüşme özeti)

  // Mevcut kolon indeksleri
  COL_CREATED: 1,    // A
  COL_LEAD_ID: 2,    // B
  COL_ADI: 3,        // C
  COL_SOYADI: 4,     // D
  COL_PHONE: 5,      // E
  COL_EMAIL: 6,      // F
  COL_COUNTRY: 7,    // G
  COL_SUREC: 8,      // H

  // Retry ayarları
  MAX_RETRIES: 3,
  RETRY_1_HOURS: 3,    // İlk retry: 3 saat sonra
  RETRY_2_HOURS: 24,   // İkinci retry: ertesi gün
};

// ---- ANA FONKSİYONLAR ----

/**
 * Yeni leadleri kontrol et ve ara
 * Her 5 dakikada bir tetiklenir
 */
function checkNewLeads() {
  if (!isCallHour()) return;

  CONFIG.SHEETS.forEach(sheetName => {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('Sheet bulunamadı: ' + sheetName);
      return;
    }

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const phone = row[CONFIG.COL_PHONE - 1];
      const botStatus = row[CONFIG.COL_BOT_STATUS - 1];

      if (!phone) continue;

      // Sadece henüz aranmamış leadleri ara (I sütunu boş)
      if (!botStatus) {
        const name = row[CONFIG.COL_ADI - 1] || '';
        const surname = row[CONFIG.COL_SOYADI - 1] || '';
        const fullName = (name + ' ' + surname).trim();
        const projectName = sheetName; // "The Elysium Girne" veya "Ada Trust Life"

        makeCall(sheet, i + 1, fullName, phone, projectName);
        Utilities.sleep(5000); // 5 sn bekle, aynı anda çok arama yapma
      }
    }
  });
}

/**
 * Retry gerektiren leadleri kontrol et
 * Her 30 dakikada bir tetiklenir
 */
function checkRetries() {
  if (!isCallHour()) return;

  const now = new Date();

  CONFIG.SHEETS.forEach(sheetName => {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(sheetName);
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const phone = row[CONFIG.COL_PHONE - 1];
      const botStatus = row[CONFIG.COL_BOT_STATUS - 1];
      const callCount = row[CONFIG.COL_CALL_COUNT - 1] || 0;
      const nextCall = row[CONFIG.COL_NEXT_CALL - 1];

      if (!phone) continue;

      // Ulaşılamadı ve retry zamanı geldi
      if (botStatus === 'ulasilamadi' && callCount < CONFIG.MAX_RETRIES && nextCall) {
        const nextCallDate = new Date(nextCall);
        if (nextCallDate <= now) {
          const name = row[CONFIG.COL_ADI - 1] || '';
          const surname = row[CONFIG.COL_SOYADI - 1] || '';
          const fullName = (name + ' ' + surname).trim();

          makeCall(sheet, i + 1, fullName, phone, sheetName);
          Utilities.sleep(5000);
        }
      }

      // 3 deneme sonrası email gönder
      if (botStatus === 'ulasilamadi' && callCount >= CONFIG.MAX_RETRIES) {
        const email = row[CONFIG.COL_EMAIL - 1];
        const botNotes = row[CONFIG.COL_BOT_NOTLAR - 1] || '';
        if (email && !botNotes.includes('email_gonderildi')) {
          const name = row[CONFIG.COL_ADI - 1] || '';
          sendFallbackEmail(sheet, i + 1, name, email, sheetName);
        }
      }
    }
  });
}

/**
 * ElevenLabs API ile arama yap
 */
function makeCall(sheet, rowIndex, fullName, phone, projectName) {
  phone = formatPhoneNumber(phone);
  if (!phone) {
    sheet.getRange(rowIndex, CONFIG.COL_BOT_STATUS).setValue('hatali_numara');
    sheet.getRange(rowIndex, CONFIG.COL_BOT_NOTLAR).setValue('Geçersiz telefon numarası');
    return;
  }

  const customerName = fullName || 'Değerli Müşterimiz';

  const payload = {
    agent_id: CONFIG.AGENT_ID,
    agent_phone_number_id: CONFIG.PHONE_NUMBER_ID,
    to_number: phone,
    conversation_initiation_client_data: {
      dynamic_variables: {
        customer_name: customerName,
        project_name: projectName
      }
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'xi-api-key': CONFIG.ELEVENLABS_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(
      'https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call', options
    );
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      const callCount = (sheet.getRange(rowIndex, CONFIG.COL_CALL_COUNT).getValue() || 0) + 1;
      sheet.getRange(rowIndex, CONFIG.COL_BOT_STATUS).setValue('araniyor');
      sheet.getRange(rowIndex, CONFIG.COL_CALL_COUNT).setValue(callCount);
      sheet.getRange(rowIndex, CONFIG.COL_CONVERSATION_ID).setValue(result.conversation_id);
      Logger.log('✓ Arama başlatıldı: ' + phone + ' | ' + projectName);
    } else {
      sheet.getRange(rowIndex, CONFIG.COL_BOT_STATUS).setValue('arama_hatasi');
      sheet.getRange(rowIndex, CONFIG.COL_BOT_NOTLAR).setValue(result.message || 'Hata');
      Logger.log('✗ Arama hatası: ' + phone + ' | ' + JSON.stringify(result));
    }
  } catch (error) {
    sheet.getRange(rowIndex, CONFIG.COL_BOT_STATUS).setValue('arama_hatasi');
    sheet.getRange(rowIndex, CONFIG.COL_BOT_NOTLAR).setValue(error.message);
    Logger.log('✗ API hatası: ' + error.message);
  }
}

/**
 * Arama sonucunu işle - Webhook endpoint
 * ElevenLabs post-call webhook buraya gönderilecek
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const conversationId = data.conversation_id || data.id;

    if (!conversationId) {
      return ContentService.createTextOutput('No conversation_id');
    }

    // Conversation detaylarını ElevenLabs'tan al
    const convData = getConversationDetails(conversationId);

    // Her iki sheet'te conversation ID'yi ara
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    for (const sheetName of CONFIG.SHEETS) {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) continue;

      const dataRange = sheet.getDataRange().getValues();

      for (let i = 1; i < dataRange.length; i++) {
        if (String(dataRange[i][CONFIG.COL_CONVERSATION_ID - 1]) === String(conversationId)) {
          processCallResult(sheet, i + 1, convData, dataRange[i]);
          return ContentService.createTextOutput('OK');
        }
      }
    }

    return ContentService.createTextOutput('Conversation not found');
  } catch (error) {
    Logger.log('Webhook hatası: ' + error.message);
    return ContentService.createTextOutput('Error: ' + error.message);
  }
}

/**
 * Arama sonucunu işle
 */
function processCallResult(sheet, rowIndex, convData, rowData) {
  const callCount = rowData[CONFIG.COL_CALL_COUNT - 1] || 1;
  const status = convData.status;
  const transcript = convData.transcript || [];

  if (status === 'done' && transcript.length > 2) {
    // Görüşme gerçekleşti
    const summary = formatTranscript(transcript);
    const isSalesReferred = summary.toLowerCase().includes('aratıyor') ||
                            summary.toLowerCase().includes('satış yetkilisi') ||
                            summary.toLowerCase().includes('yöneticimize');

    sheet.getRange(rowIndex, CONFIG.COL_BOT_STATUS)
      .setValue(isSalesReferred ? 'satisa_aktarildi' : 'gorusuldu');
    sheet.getRange(rowIndex, CONFIG.COL_BOT_NOTLAR).setValue(summary);

  } else {
    // Ulaşılamadı veya çok kısa görüşme
    if (callCount >= CONFIG.MAX_RETRIES) {
      sheet.getRange(rowIndex, CONFIG.COL_BOT_STATUS).setValue('pasif');
      sheet.getRange(rowIndex, CONFIG.COL_BOT_NOTLAR)
        .setValue(callCount + ' deneme - ulaşılamadı');
    } else {
      const nextCall = calculateNextRetry(callCount);
      sheet.getRange(rowIndex, CONFIG.COL_BOT_STATUS).setValue('ulasilamadi');
      sheet.getRange(rowIndex, CONFIG.COL_NEXT_CALL).setValue(nextCall);
      sheet.getRange(rowIndex, CONFIG.COL_BOT_NOTLAR)
        .setValue('Deneme ' + callCount + ' - ulaşılamadı | Sonraki: ' +
                  Utilities.formatDate(nextCall, CONFIG.TIMEZONE, 'dd.MM.yyyy HH:mm'));
    }
  }
}

/**
 * ElevenLabs'tan conversation detaylarını al
 */
function getConversationDetails(conversationId) {
  const options = {
    method: 'get',
    headers: { 'xi-api-key': CONFIG.ELEVENLABS_API_KEY },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(
      'https://api.elevenlabs.io/v1/convai/conversations/' + conversationId, options
    );
    return JSON.parse(response.getContentText());
  } catch (error) {
    Logger.log('Conversation detay hatası: ' + error.message);
    return { status: 'failed', transcript: [] };
  }
}

// ---- YARDIMCI FONKSİYONLAR ----

function isCallHour() {
  const now = new Date();
  const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
  const hour = turkeyTime.getHours();
  return hour >= CONFIG.CALL_START_HOUR && hour < CONFIG.CALL_END_HOUR;
}

function calculateNextRetry(callCount) {
  const now = new Date();
  let nextCall;

  if (callCount <= 1) {
    nextCall = new Date(now.getTime() + CONFIG.RETRY_1_HOURS * 60 * 60 * 1000);
  } else {
    nextCall = new Date(now.getTime() + CONFIG.RETRY_2_HOURS * 60 * 60 * 1000);
  }

  // Arama saati dışındaysa ertesi gün 11:00'e ayarla
  const nextHour = new Date(nextCall.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
  if (nextHour.getHours() >= CONFIG.CALL_END_HOUR || nextHour.getHours() < CONFIG.CALL_START_HOUR) {
    nextCall.setDate(nextCall.getDate() + (nextHour.getHours() >= CONFIG.CALL_END_HOUR ? 1 : 0));
    nextCall = new Date(nextCall.toLocaleString('en-US', { timeZone: CONFIG.TIMEZONE }));
    nextCall.setHours(CONFIG.CALL_START_HOUR, 0, 0, 0);
  }

  return nextCall;
}

function formatPhoneNumber(phone) {
  if (!phone) return null;
  phone = String(phone).replace(/[\s\-\(\)\+]/g, '');

  if (phone.startsWith('90') && phone.length === 12) return '+' + phone;
  if (phone.startsWith('0') && phone.length === 11) return '+9' + phone;
  if (phone.startsWith('5') && phone.length === 10) return '+90' + phone;
  if (phone.length === 12 && phone.startsWith('905')) return '+' + phone;

  Logger.log('Geçersiz numara: ' + phone);
  return null;
}

function formatTranscript(transcript) {
  if (typeof transcript === 'string') return transcript.substring(0, 500);
  if (Array.isArray(transcript)) {
    return transcript
      .filter(t => t.message && t.role !== 'system')
      .map(t => (t.role === 'agent' ? 'Bot' : 'Müşteri') + ': ' + t.message)
      .join('\n')
      .substring(0, 800);
  }
  return '';
}

function sendFallbackEmail(sheet, rowIndex, name, email, projectName) {
  const subject = 'AdaTrust - ' + projectName + ' Hakkında Bilgi';
  const body = 'Sayın ' + (name || 'Değerli Müşterimiz') + ',\n\n' +
    'AdaTrust projelerimize göstermiş olduğunuz ilgi için teşekkür ederiz.\n\n' +
    'Sizinle telefonda görüşme fırsatı bulamadık. ' + projectName +
    ' projemiz hakkında detaylı bilgi almak için:\n\n' +
    '📞 Bizi arayabilirsiniz: +90 850 307 4720\n' +
    '📱 WhatsApp: +90 850 307 4720\n\n' +
    'Saygılarımızla,\nAdaTrust Gayrimenkul';

  try {
    MailApp.sendEmail(email, subject, body);
    const notes = sheet.getRange(rowIndex, CONFIG.COL_BOT_NOTLAR).getValue() || '';
    sheet.getRange(rowIndex, CONFIG.COL_BOT_NOTLAR).setValue(notes + ' | email_gonderildi');
    sheet.getRange(rowIndex, CONFIG.COL_BOT_STATUS).setValue('email_gonderildi');
    Logger.log('✓ Email gönderildi: ' + email);
  } catch (error) {
    Logger.log('✗ Email hatası: ' + error.message);
  }
}

// ---- KURULUM (BİR KEZ ÇALIŞTIR) ----

/**
 * Otomasyon başlıklarını ekle ve trigger'ları kur
 * İLK KURULUMDA BİR KEZ ÇALIŞTIRIN
 */
function ilkKurulum() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

  // Her iki sheet'e otomasyon başlıkları ekle
  CONFIG.SHEETS.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const headers = ['BOT DURUMU', 'ARAMA SAYISI', 'SONRAKİ ARAMA', 'CONVERSATION ID', 'BOT NOTLARI'];
    const startCol = CONFIG.COL_BOT_STATUS; // I sütunu

    sheet.getRange(1, startCol, 1, headers.length).setValues([headers]);
    sheet.getRange(1, startCol, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#ff6d01')
      .setFontColor('#ffffff');

    sheet.setColumnWidth(startCol, 140);     // Bot Durumu
    sheet.setColumnWidth(startCol + 1, 100); // Arama Sayısı
    sheet.setColumnWidth(startCol + 2, 160); // Sonraki Arama
    sheet.setColumnWidth(startCol + 3, 200); // Conversation ID
    sheet.setColumnWidth(startCol + 4, 400); // Bot Notları

    Logger.log('✓ Başlıklar eklendi: ' + sheetName);
  });

  // Trigger'ları kur
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('checkNewLeads')
    .timeBased()
    .everyMinutes(5)
    .create();

  ScriptApp.newTrigger('checkRetries')
    .timeBased()
    .everyMinutes(30)
    .create();

  Logger.log('✓ Trigger\'lar kuruldu! Sistem aktif.');
  Logger.log('  - checkNewLeads: her 5 dakika');
  Logger.log('  - checkRetries: her 30 dakika');
  Logger.log('  - Arama saatleri: ' + CONFIG.CALL_START_HOUR + ':00 - ' + CONFIG.CALL_END_HOUR + ':00');
}

/**
 * Sistemi test et - tek bir numaraya test araması yap
 */
function testCall() {
  const testPhone = '+905326023199';
  const testName = 'Onur';
  const testProject = 'The Elysium Girne';

  Logger.log('Test araması başlatılıyor: ' + testPhone);

  const payload = {
    agent_id: CONFIG.AGENT_ID,
    agent_phone_number_id: CONFIG.PHONE_NUMBER_ID,
    to_number: testPhone,
    conversation_initiation_client_data: {
      dynamic_variables: {
        customer_name: testName,
        project_name: testProject
      }
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'xi-api-key': CONFIG.ELEVENLABS_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(
    'https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call', options
  );
  const result = JSON.parse(response.getContentText());
  Logger.log('Sonuç: ' + JSON.stringify(result));
}

/**
 * Belirli bir conversation'ın sonucunu manuel kontrol et
 */
function checkConversation(conversationId) {
  const details = getConversationDetails(conversationId);
  Logger.log('Status: ' + details.status);
  Logger.log('Transcript:');
  if (details.transcript) {
    details.transcript.forEach(t => {
      if (t.message) Logger.log(t.role + ': ' + t.message);
    });
  }
}
