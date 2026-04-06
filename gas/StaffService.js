/**
 * Lấy danh sách nhân viên và trạng thái làm việc
 */
function getStaffData() {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_STAFF);
  const data = sheet.getDataRange().getValues();
  
  let staffList = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // STAFF_ID
      staffList.push({
        STAFF_ID: data[i][0].toString(),
        STAFF_NAME: data[i][1].toString(),
        PHONE: data[i][2].toString(),
        POSITION: data[i][3],
        EMPLOYMENT_TYPE: data[i][4],
        BASE_SALARY: Number(data[i][5]) || 0,
        START_DATE: data[i][6],
        STATUS: data[i][7] === true // Checkbox đang làm việc
      });
    }
  }
  return staffList;
}

/**
 * Xử lý Chấm công (Check-in / Check-out)
 * @param {Object} payload { action: "attendance", STAFF_ID: "NV01", type: "in"/"out" }
 */
function handleAttendance(payload) {
  const db = getActiveDB();
  const sheetCC = db.getSheetByName("CHAM_CONG");
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
  const monthYear = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/yyyy");

  if (payload.type === "in") {
    // Tạo dòng mới cho Check-in
    const logId = "LOG-" + now.getTime();
    sheetCC.appendRow([
      logId,
      dateStr,
      payload.STAFF_ID,
      timeStr,
      "", // Out trống
      0,  // Tổng giờ trống
      0,  // Lương tạm tính trống
      monthYear
    ]);
    return { status: "Check-in thành công", time: timeStr };
  } 
  
  else if (payload.type === "out") {
    // Tìm dòng Check-in gần nhất chưa có Check-out của nhân viên này trong ngày
    const data = sheetCC.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][2] === payload.STAFF_ID && data[i][1] === dateStr && data[i][4] === "") {
        const row = i + 1;
        sheetCC.getRange(row, 5).setValue(timeStr); // Cập nhật Time_Out
        
        // Tính toán tổng giờ và lương tại chỗ (Nếu sếp không dùng công thức ARRAYFORMULA trên sheet)
        const timeIn = new Date(dateStr + " " + data[i][3]);
        const timeOut = new Date(dateStr + " " + timeStr);
        const diffHours = (timeOut - timeIn) / (1000 * 60 * 60);
        
        sheetCC.getRange(row, 6).setValue(diffHours.toFixed(2));
        return { status: "Check-out thành công", duration: diffHours.toFixed(2) };
      }
    }
    throw new Error("Không tìm thấy phiên Check-in phù hợp để Check-out.");
  }
}

/**
 * Cập nhật thông tin nhân viên (Bật/Tắt trạng thái làm việc)
 */
function updateStaffStatus(payload) {
  const db = getActiveDB();
  const sheet = db.getSheetByName(CONFIG.SHEET_STAFF);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === payload.STAFF_ID) {
      const row = i + 1;
      if (payload.STATUS !== undefined) {
        sheet.getRange(row, 8).setValue(payload.STATUS); // Cột H
      }
      return { message: "Đã cập nhật nhân sự " + payload.STAFF_ID };
    }
  }
  throw new Error("Không tìm thấy nhân viên.");
}