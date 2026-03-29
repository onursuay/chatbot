// ============================================
// AdaTrust Lead Otomasyon - Google Apps Script
// ElevenLabs Conversational AI Entegrasyonu
// ============================================

// ---- AYARLAR ----
const CONFIG = {
  ELEVENLABS_API_KEY: 'sk_0d51695227fae84dc5fcdeef3f11576722b9015f39f6b118',
  AGENT_ID: 'agent_6001kmjcyzpwfzp89qrq5d1wpagt',
  PHONE_NUMBER_ID: 'phnum_8301kmjr58d6eh3822mjp6ta8ern',

  // Arama saatleri (Türkiye saati)
  CALL_START_HOUR: 11,  // 11:00
  CALL_END_HOUR: 18,    // 18:00
  TIMEZONE: 'Europe/Istanbul',

  // Sheet ayarları
  LEADS_SHEET_NAME: 'Leads',        // Meta leadlerinin düştüğü sheet
  RESULTS_SHEET_NAME: 'Sonuçlar',   // Arama sonuçları

  // Kolon indeksleri (1'den başlar) - SHEET YAPINIZA GÖRE GÜNCELLENECEK
  COL_NAME: 1,           // İsim
  COL_PHONE: 2,          // Telefon
  COL_EMAIL: 3,          // Email
  COL_SOURCE: 4,         // Kaynak (Form/WhatsApp)
  COL_STATUS: 5,         // Durum
  COL_CALL_COUNT: 6,     // Arama sayısı
  COL_NEXT_CALL: 7,      // Sonraki arama zamanı
  COL_LAST_UPDATE: 8,    // Son güncelleme
  COL_NOTES: 9,          // Notlar
  COL_CONVERSATION_ID: 10, // ElevenLabs conversation ID

  // Retry ayarları
  MAX_RETRIES: 3,        // Maksimum arama denemesi
  RETRY_1_HOURS: 3,      // İlk retry: 3 saat sonra
  RETRY_2_HOURS: 24,     // İkinci retry: ertesi gün
};

// ---- ANA FONKSİYONLAR ----

/**
 * Yeni leadleri kontrol et ve ara
 * Bu fonksiyon her 5 dakikada bir tetiklenir (Time-driven trigger)
 */
function checkNewLeads() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.LEADS_SHEET_NAME);
  if (!sheet) {
    Logger.log('Leads sheet bulunamadı: ' + CONFIG.LEADS_SHEET_NAME);
    return;
  }

  const data = sheet.getDataRange().getValues();
  const now = new Date();

  // Arama saati kontrolü
  if (!isCallHour(now)) {
    Logger.log('Arama saati dışında: ' + now.toLocaleString('tr-TR', {timeZone: CONFIG.TIMEZONE}));
    return;
  }

  // Her satırı kontrol et (başlık satırını atla)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[CONFIG.COL_STATUS - 1];
    const phone = row[CONFIG.COL_PHONE - 1];
    const name = row[CONFIG.COL_NAME - 1];

    if (!phone) continue;

    // Yeni lead - henüz aranmamış
    if (!status || status === 'yeni') {
      makeCall(sheet, i + 1, name, phone);
      // Aynı anda birden fazla arama yapmamak için 5 saniye bekle
      Utilities.sleep(5000);
    }
  }
}

/**
 * Retry gerektiren leadleri kontrol et ve tekrar ara
 * Bu fonksiyon her 30 dakikada bir tetiklenir
 */
function checkRetries() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.LEADS_SHEET_NAME);
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const now = new Date();

  if (!isCallHour(now)) return;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[CONFIG.COL_STATUS - 1];
    const phone = row[CONFIG.COL_PHONE - 1];
    const name = row[CONFIG.COL_NAME - 1];
    const callCount = row[CONFIG.COL_CALL_COUNT - 1] || 0;
    const nextCall = row[CONFIG.COL_NEXT_CALL - 1];

    if (!phone) continue;

    // Ulaşılamadı ve retry zamanı geldi
    if (status === 'ulasilamadi' && callCount < CONFIG.MAX_RETRIES) {
      if (nextCall && new Date(nextCall) <= now) {
        makeCall(sheet, i + 1, name, phone);
        Utilities.sleep(5000);
      }
    }

    // 3 deneme sonrası email gönder
    if (status === 'ulasilamadi' && callCount >= CONFIG.MAX_RETRIES) {
      const email = row[CONFIG.COL_EMAIL - 1];
      if (email && !row[CONFIG.COL_NOTES - 1]?.includes('email_gonderildi')) {
        sendFallbackEmail(sheet, i + 1, name, email);
      }
    }
  }
}

/**
 * ElevenLabs API ile arama yap
 */
function makeCall(sheet, rowIndex, name, phone) {
  // Telefon numarasını formatla
  phone = formatPhoneNumber(phone);
  if (!phone) {
    updateRow(sheet, rowIndex, 'hatali_numara', null, 'Geçersiz telefon numarası');
    return;
  }

  const customerName = name || 'Değerli Müşterimiz';

  const payload = {
    agent_id: CONFIG.AGENT_ID,
    agent_phone_number_id: CONFIG.PHONE_NUMBER_ID,
    to_number: phone,
    conversation_initiation_client_data: {
      dynamic_variables: {
        customer_name: customerName
      }
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'xi-api-key': CONFIG.ELEVENLABS_API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call', options);
    const result = JSON.parse(response.getContentText());

    if (result.success) {
      const callCount = (sheet.getRange(rowIndex, CONFIG.COL_CALL_COUNT).getValue() || 0) + 1;
      sheet.getRange(rowIndex, CONFIG.COL_STATUS).setValue('araniyor');
      sheet.getRange(rowIndex, CONFIG.COL_CALL_COUNT).setValue(callCount);
      sheet.getRange(rowIndex, CONFIG.COL_CONVERSATION_ID).setValue(result.conversation_id);
      sheet.getRange(rowIndex, CONFIG.COL_LAST_UPDATE).setValue(new Date());
      Logger.log('Arama başlatıldı: ' + phone + ' | Conv: ' + result.conversation_id);
    } else {
      Logger.log('Arama hatası: ' + JSON.stringify(result));
      updateRow(sheet, rowIndex, 'arama_hatasi', null, result.message || 'Bilinmeyen hata');
    }
  } catch (error) {
    Logger.log('API hatası: ' + error.message);
    updateRow(sheet, rowIndex, 'arama_hatasi', null, error.message);
  }
}

/**
 * Arama sonucunu işle (Webhook'tan çağrılır)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const conversationId = data.conversation_id;
    const transcript = data.transcript || '';
    const status = data.status;
    const analysis = data.analysis || {};

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.LEADS_SHEET_NAME);
    if (!sheet) return ContentService.createTextOutput('Sheet bulunamadı');

    // Conversation ID ile satırı bul
    const dataRange = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < dataRange.length; i++) {
      if (dataRange[i][CONFIG.COL_CONVERSATION_ID - 1] === conversationId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      Logger.log('Conversation bulunamadı: ' + conversationId);
      return ContentService.createTextOutput('Not found');
    }

    const callCount = dataRange[rowIndex - 1][CONFIG.COL_CALL_COUNT - 1] || 1;

    // Arama sonucuna göre durum güncelle
    if (status === 'done' && transcript.length > 0) {
      // Görüşme yapıldı
      const summary = extractSummary(transcript);
      updateRow(sheet, rowIndex, 'gorüsüldü', null, summary);

      // Satış yöneticisine yönlendirildi mi kontrol et
      if (transcript.toLowerCase().includes('aratıyor olacağım') ||
          transcript.toLowerCase().includes('satış yetkilisi')) {
        sheet.getRange(rowIndex, CONFIG.COL_STATUS).setValue('satisa_aktarildi');
      }
    } else if (status === 'failed' || transcript.length === 0) {
      // Ulaşılamadı - retry planla
      const nextCallDate = calculateNextRetry(callCount);

      if (callCount >= CONFIG.MAX_RETRIES) {
        updateRow(sheet, rowIndex, 'pasif', null, callCount + ' deneme - ulaşılamadı');
      } else {
        updateRow(sheet, rowIndex, 'ulasilamadi', nextCallDate,
                  'Deneme ' + callCount + ' - ulaşılamadı');
      }
    }

    return ContentService.createTextOutput('OK');
  } catch (error) {
    Logger.log('Webhook hatası: ' + error.message);
    return ContentService.createTextOutput('Error: ' + error.message);
  }
}

// ---- YARDIMCI FONKSİYONLAR ----

/**
 * Arama saati kontrolü (11:00 - 18:00 Türkiye saati)
 */
function isCallHour(date) {
  const turkeyTime = new Date(date.toLocaleString('en-US', {timeZone: CONFIG.TIMEZONE}));
  const hour = turkeyTime.getHours();
  return hour >= CONFIG.CALL_START_HOUR && hour < CONFIG.CALL_END_HOUR;
}

/**
 * Sonraki retry zamanını hesapla
 */
function calculateNextRetry(callCount) {
  const now = new Date();
  let nextCall;

  if (callCount <= 1) {
    // İlk retry: 3 saat sonra
    nextCall = new Date(now.getTime() + CONFIG.RETRY_1_HOURS * 60 * 60 * 1000);
  } else {
    // İkinci retry: ertesi gün saat 11:00
    nextCall = new Date(now.getTime() + CONFIG.RETRY_2_HOURS * 60 * 60 * 1000);
    nextCall.setHours(CONFIG.CALL_START_HOUR, 0, 0, 0);
  }

  // Arama saati dışındaysa ertesi gün 11:00'e ayarla
  if (!isCallHour(nextCall)) {
    if (nextCall.getHours() >= CONFIG.CALL_END_HOUR) {
      nextCall.setDate(nextCall.getDate() + 1);
    }
    nextCall.setHours(CONFIG.CALL_START_HOUR, 0, 0, 0);
  }

  return nextCall;
}

/**
 * Telefon numarasını E.164 formatına çevir
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  phone = String(phone).replace(/[\s\-\(\)]/g, '');

  // Zaten +90 ile başlıyorsa
  if (phone.startsWith('+90') && phone.length === 13) return phone;

  // 0 ile başlıyorsa
  if (phone.startsWith('0') && phone.length === 11) return '+9' + phone;

  // 5 ile başlıyorsa (başında 0 yok)
  if (phone.startsWith('5') && phone.length === 10) return '+90' + phone;

  // 90 ile başlıyorsa
  if (phone.startsWith('90') && phone.length === 12) return '+' + phone;

  Logger.log('Geçersiz numara formatı: ' + phone);
  return null;
}

/**
 * Satırı güncelle
 */
function updateRow(sheet, rowIndex, status, nextCall, notes) {
  if (status) sheet.getRange(rowIndex, CONFIG.COL_STATUS).setValue(status);
  if (nextCall) sheet.getRange(rowIndex, CONFIG.COL_NEXT_CALL).setValue(nextCall);
  if (notes) sheet.getRange(rowIndex, CONFIG.COL_NOTES).setValue(notes);
  sheet.getRange(rowIndex, CONFIG.COL_LAST_UPDATE).setValue(new Date());
}

/**
 * Transcript'ten özet çıkar
 */
function extractSummary(transcript) {
  if (typeof transcript === 'string') return transcript.substring(0, 500);

  // Transcript array ise
  if (Array.isArray(transcript)) {
    return transcript
      .filter(t => t.message)
      .map(t => t.role + ': ' + t.message)
      .join('\n')
      .substring(0, 500);
  }

  return JSON.stringify(transcript).substring(0, 500);
}

/**
 * Ulaşılamayan leadlere email gönder
 */
function sendFallbackEmail(sheet, rowIndex, name, email) {
  const subject = 'AdaTrust - Projelerimiz Hakkında Bilgi';
  const body = `Sayın ${name || 'Değerli Müşterimiz'},

AdaTrust projelerimize göstermiş olduğunuz ilgi için teşekkür ederiz.

Sizinle telefonda görüşme fırsatı bulamadık. Projelerimiz hakkında detaylı bilgi almak için:

📞 Bizi arayabilirsiniz: +90 850 307 4720
📱 WhatsApp: +90 850 307 4720

Projelerimiz:
🏠 Ada Trust Life - Gazimağusa (Konut)
🏡 The Elysium Girne (Villa)

Detaylı bilgi için satış ekibimiz sizinle iletişime geçecektir.

Saygılarımızla,
AdaTrust Gayrimenkul`;

  try {
    MailApp.sendEmail(email, subject, body);
    const currentNotes = sheet.getRange(rowIndex, CONFIG.COL_NOTES).getValue() || '';
    sheet.getRange(rowIndex, CONFIG.COL_NOTES).setValue(currentNotes + ' | email_gonderildi');
    sheet.getRange(rowIndex, CONFIG.COL_STATUS).setValue('email_gonderildi');
    sheet.getRange(rowIndex, CONFIG.COL_LAST_UPDATE).setValue(new Date());
    Logger.log('Email gönderildi: ' + email);
  } catch (error) {
    Logger.log('Email hatası: ' + error.message);
  }
}

// ---- KURULUM FONKSİYONLARI ----

/**
 * Trigger'ları kur (BİR KEZ ÇALIŞTIR)
 */
function setupTriggers() {
  // Mevcut trigger'ları temizle
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));

  // Her 5 dakikada yeni leadleri kontrol et
  ScriptApp.newTrigger('checkNewLeads')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Her 30 dakikada retry'ları kontrol et
  ScriptApp.newTrigger('checkRetries')
    .timeBased()
    .everyMinutes(30)
    .create();

  Logger.log('Trigger\'lar kuruldu!');
}

/**
 * Sheet başlıklarını oluştur (BİR KEZ ÇALIŞTIR)
 */
function setupSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Leads sheet
  let leadsSheet = ss.getSheetByName(CONFIG.LEADS_SHEET_NAME);
  if (!leadsSheet) {
    leadsSheet = ss.insertSheet(CONFIG.LEADS_SHEET_NAME);
  }

  const headers = [
    'İsim', 'Telefon', 'Email', 'Kaynak', 'Durum',
    'Arama Sayısı', 'Sonraki Arama', 'Son Güncelleme',
    'Notlar', 'Conversation ID'
  ];

  leadsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  leadsSheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4a86c8')
    .setFontColor('#ffffff');

  // Kolon genişlikleri
  leadsSheet.setColumnWidth(1, 150);  // İsim
  leadsSheet.setColumnWidth(2, 150);  // Telefon
  leadsSheet.setColumnWidth(3, 200);  // Email
  leadsSheet.setColumnWidth(4, 100);  // Kaynak
  leadsSheet.setColumnWidth(5, 130);  // Durum
  leadsSheet.setColumnWidth(6, 100);  // Arama Sayısı
  leadsSheet.setColumnWidth(7, 160);  // Sonraki Arama
  leadsSheet.setColumnWidth(8, 160);  // Son Güncelleme
  leadsSheet.setColumnWidth(9, 300);  // Notlar
  leadsSheet.setColumnWidth(10, 200); // Conversation ID

  Logger.log('Sheet başlıkları oluşturuldu!');
}
