// ===============================================
// Marine Check-in System - Admin Dashboard
// เวอร์ชันแก้ไขสมบูรณ์
// ===============================================

const API_URL = "https://script.google.com/macros/s/AKfycbyCIh1qeL5-ZWsklfBhd0UuSwRgJz-RpXh6qOug4ul1I3bcE2G1CPwz3x1nLSZxwBML/exec"; 
let dashboardTimer;

// ===============================================
// ระบบรักษาความปลอดภัย (Admin Login)
// ===============================================
async function checkLogin() {
    const adminContent = document.querySelector('.admin-container');
    if (adminContent) adminContent.style.display = 'none';

    const { value: password } = await Swal.fire({
        title: '🔒 กรุณาใส่รหัสผ่านแอดมิน',
        input: 'password',
        inputPlaceholder: 'ใส่รหัสผ่านที่นี่',
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonText: 'เข้าสู่ระบบ',
        confirmButtonColor: '#001f3f',
    });

    Swal.fire({ title: 'กำลังตรวจสอบ...', didOpen: () => Swal.showLoading() });

    try {
        const res = await fetch(`${API_URL}?action=adminLogin&password=${encodeURIComponent(password)}`);
        const result = await res.json();

        if (result.success) {
            if (adminContent) adminContent.style.display = 'flex';
            Swal.fire({ icon: 'success', title: 'ยินดีต้อนรับ', timer: 1000, showConfirmButton: false });
            initApp();
        } else {
            await Swal.fire({ icon: 'error', title: 'รหัสผ่านไม่ถูกต้อง', text: 'กรุณาลองใหม่อีกครั้ง' });
            checkLogin(); 
        }
    } catch (e) {
        console.error('Login error:', e);
        await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
        checkLogin();
    }
}

// เรียกใช้ Login เมื่อโหลดหน้า
checkLogin();

// ===============================================
// เริ่มต้นระบบหลัง Login สำเร็จ
// ===============================================
function initApp() {
    const logDate = document.getElementById('logDate');
    if (logDate) logDate.valueAsDate = new Date();
    
    loadDashboard();
    updateLeaveBadge();
    startRealTimeUpdate();
}

// อัปเดตข้อมูลแบบเรียลไทม์
function startRealTimeUpdate() {
    if (dashboardTimer) clearInterval(dashboardTimer);
    
    dashboardTimer = setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadDashboard();
        }
        updateLeaveBadge();
        if (document.getElementById('leaveRequests').classList.contains('active')) {
            loadPendingLeave();
        }
    }, 15000); // อัปเดตทุก 15 วินาที
}

// ===============================================
// ระบบจัดการใบลา
// ===============================================
async function loadPendingLeave() {
    const tableBody = document.getElementById('leaveBody');
    if (!tableBody) return;
    
    try {
        const res = await fetch(`${API_URL}?action=getPendingLeave`);
        const data = await res.json();
        
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">✅ ไม่มีคำขอลาใหม่</td></tr>';
            return;
        }
        
        tableBody.innerHTML = data.map(item => `
            <tr>
                <td><strong>${item.name}</strong> (${item.year})</td>
                <td>${item.reason}</td>
                <td>
                    ${item.imageUrl ? `<a href="${item.imageUrl}" target="_blank" style="color:#00d2d3; font-weight:bold;">🖼️ ดูรูปหลักฐาน</a>` : '<span style="color:#999;">ไม่มีรูป</span>'}
                </td>
                <td>
                    <button onclick="processLeave('${item.id}', 'Approved')" class="btn-save" style="background:#28a745; width:auto; padding:5px 10px; margin-right:5px;">อนุมัติ</button>
                    <button onclick="processLeave('${item.id}', 'Rejected')" class="btn-save" style="background:#d33; width:auto; padding:5px 10px;">ไม่อนุมัติ</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Load pending leave error:', e);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">เกิดข้อผิดพลาดในการโหลดข้อมูล</td></tr>';
    }
}

async function processLeave(id, status) {
    const statusText = status === 'Approved' ? 'อนุมัติ' : 'ไม่อนุมัติ';
    
    const result = await Swal.fire({
        title: 'ยืนยันการตัดสินใจ?',
        text: `คุณต้องการ${statusText}ใบลานี้ใช่หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'ตกลง',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
        
        try {
            const res = await fetch(`${API_URL}?action=processLeave&id=${id}&status=${status}`);
            const data = await res.json();
            
            if (data.status === "success") {
                Swal.fire("สำเร็จ", "บันทึกสถานะเรียบร้อยแล้ว", "success");
                loadDashboard();
                loadPendingLeave();
                updateLeaveBadge();
            } else {
                Swal.fire("ผิดพลาด", data.message || "ไม่สามารถบันทึกได้", "error");
            }
        } catch (e) {
            console.error('Process leave error:', e);
            Swal.fire("ผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
        }
    }
}

// ===============================================
// จัดการรายชื่อนักศึกษา
// ===============================================
async function loadStudentList() {
    const container = document.getElementById('studentAccordionContainer');
    if (!container) return;

    container.innerHTML = '<p align="center" style="padding: 20px;">⏳ กำลังโหลดข้อมูลแยกตามชั้นปี...</p>';

    try {
        const res = await fetch(`${API_URL}?action=getStudents`);
        const data = await res.json();
        
        let html = '';
        const years = ["ปี 1", "ปี 2", "ปี 3", "ปี 4"];

        years.forEach(year => {
            const studentsInYear = data[year] || [];
            const count = studentsInYear.length;

            html += `
                <div class="accordion-item" style="margin-bottom: 10px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                    <div class="accordion-header" onclick="toggleYear('${year}')" 
                         style="background: #001f3f; color: white; padding: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                        <span>📂 ชั้นปีที่ ${year.replace('ปี ', '')} (${count} คน)</span>
                        <span id="icon-${year.replace(' ', '')}">➕</span>
                    </div>
                    <div id="content-${year.replace(' ', '')}" class="accordion-content" style="display: none; background: white;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #eee;">
                                <tr>
                                    <th style="padding: 10px; text-align: left;">ชื่อ-นามสกุล</th>
                                    <th style="padding: 10px; width: 80px; text-align: center;">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${studentsInYear.map(name => `
                                    <tr style="border-bottom: 1px solid #eee;">
                                        <td style="padding: 10px;">${name}</td>
                                        <td align="center" style="padding: 10px;">
                                            <button onclick="deleteStudent('${year}', '${name}')" 
                                                style="background:#ff4757; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">ลบ</button>
                                        </td>
                                    </tr>
                                `).join('') || '<tr><td colspan="2" align="center" style="padding:20px;">ไม่มีข้อมูล</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (e) {
        console.error('Load student list error:', e);
        container.innerHTML = '<p align="center" style="color:red; padding: 20px;">❌ ไม่สามารถโหลดข้อมูลได้</p>';
    }
}

function toggleYear(year) {
    const id = year.replace(' ', '');
    const content = document.getElementById(`content-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    
    if (content.style.display === "none") {
        content.style.display = "block";
        icon.innerText = "➖";
    } else {
        content.style.display = "none";
        icon.innerText = "➕";
    }
}

async function addStudent() {
    const year = document.getElementById('addYear').value;
    const name = document.getElementById('addName').value.trim();
    
    if (!name) {
        return Swal.fire('เตือน', 'กรุณากรอกชื่อ-นามสกุล', 'warning');
    }

    Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
    
    const params = new URLSearchParams({ 
        action: 'addStudent', 
        year: year, 
        name: name 
    });
    
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: params, 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
        });
        
        const result = await res.json();
        
        if (result.status === 'success') {
            document.getElementById('addName').value = '';
            Swal.fire('สำเร็จ', 'เพิ่มรายชื่อนักศึกษาแล้ว', 'success');
            loadStudentList();
        } else {
            Swal.fire('ผิดพลาด', result.message || 'ไม่สามารถเพิ่มข้อมูลได้', 'error');
        }
    } catch (e) {
        console.error('Add student error:', e);
        Swal.fire('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
}

async function deleteStudent(year, name) {
    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: `คุณต้องการลบ "${name}" หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'ใช่, ลบเลย!',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });
        
        try {
            const res = await fetch(`${API_URL}?action=deleteStudent&year=${encodeURIComponent(year)}&name=${encodeURIComponent(name)}`);
            const data = await res.json();
            
            if (data.status === 'success') {
                Swal.fire('ลบสำเร็จ!', '', 'success');
                loadStudentList();
            } else {
                Swal.fire('ผิดพลาด', data.message || 'ไม่สามารถลบได้', 'error');
            }
        } catch (e) {
            console.error('Delete student error:', e);
            Swal.fire('ผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
        }
    }
}

// ===============================================
// ฟังก์ชันเสริม (Dashboard, Logs, Settings)
// ===============================================
async function show(id) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-btn, .m-nav-btn').forEach(b => b.classList.remove('active'));
    
    if (document.getElementById('nav-' + id)) document.getElementById('nav-' + id).classList.add('active');
    if (document.getElementById('m-nav-' + id)) document.getElementById('m-nav-' + id).classList.add('active');

    if (id === 'settings') loadSettings();
    if (id === 'dashboard') loadDashboard();
    if (id === 'leaveRequests') loadPendingLeave();
    if (id === 'logs') loadLogs();
    if (id === 'studentManage') loadStudentList();
}

async function loadLogs() {
    const date = document.getElementById('logDate').value;
    const year = document.getElementById('logYear').value; 
    const body = document.getElementById('logBody');
    
    body.innerHTML = '<tr><td colspan="4" align="center" style="padding: 20px;">⏳ กำลังค้นหา...</td></tr>';
    
    try {
        const res = await fetch(`${API_URL}?action=getLogs&date=${date}&year=${encodeURIComponent(year)}`);
        const data = await res.json();
        
        if (data.length === 0) {
            body.innerHTML = '<tr><td colspan="4" align="center" style="padding: 20px;">❌ ไม่พบข้อมูล</td></tr>';
            return;
        }
        
        body.innerHTML = data.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.time}</td>
                <td><span class="status-badge ${getStatusClass(item.status)}">${item.status}</span></td>
                <td>${item.distance}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Load logs error:', e);
        body.innerHTML = '<tr><td colspan="4" align="center" style="color:red; padding: 20px;">❌ เกิดข้อผิดพลาด</td></tr>';
    }
}

function getStatusClass(status) {
    const statusMap = { 
        'ปกติ': 'present', 
        'สาย': 'late', 
        'ลา': 'leave',
        'ขาด': 'absent'
    };
    return statusMap[status] || 'absent';
}

async function updateLeaveBadge() {
    try {
        const res = await fetch(`${API_URL}?action=getPendingLeave`);
        const data = await res.json();
        const badge = document.getElementById('leaveBadge');
        
        if (badge) {
            badge.innerText = data.length;
            badge.style.display = data.length > 0 ? 'inline-block' : 'none';
        }
    } catch (e) {
        console.error('Update badge error:', e);
    }
}

async function loadDashboard() {
    try {
        const res = await fetch(`${API_URL}?action=summary`);
        const data = await res.json();
        
        for (let i = 1; i <= 4; i++) {
            const y = data[`y${i}`];
            if (y) {
                document.getElementById(`y${i}-present`).innerText = y.present;
                document.getElementById(`y${i}-late`).innerText = y.late;
                document.getElementById(`y${i}-leave`).innerText = y.leave;
                document.getElementById(`y${i}-absent`).innerText = y.absent;
            }
        }
    } catch (e) {
        console.error('Load dashboard error:', e);
    }
}

async function loadSettings() {
    try {
        const res = await fetch(`${API_URL}?action=getSettings`);
        const data = await res.json();
        
        document.getElementById('lat').value = data.lat || "";
        document.getElementById('lng').value = data.lng || "";
        document.getElementById('radius').value = data.radius || "50";
        document.getElementById('alertText').value = data.alertText || "";
        document.getElementById('systemToggle').checked = data.systemOpen !== false;
    } catch (e) {
        console.error('Load settings error:', e);
    }
}

async function save() {
    const params = new URLSearchParams({
        action: "saveSettings",
        lat: document.getElementById('lat').value,
        lng: document.getElementById('lng').value,
        radius: document.getElementById('radius').value,
        alertText: document.getElementById('alertText').value,
        systemOpen: document.getElementById('systemToggle').checked ? "true" : "false" 
    });
    
    Swal.fire({ title: 'กำลังบันทึก...', didOpen: () => Swal.showLoading() });
    
    try {
        const res = await fetch(API_URL, { 
            method: "POST", 
            body: params, 
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' } 
        });
        
        const result = await res.json();
        
        if (result.status === 'success') {
            Swal.fire("สำเร็จ", "บันทึกการตั้งค่าแล้ว", "success");
        } else {
            Swal.fire("ผิดพลาด", result.message || "ไม่สามารถบันทึกได้", "error");
        }
    } catch (e) {
        console.error('Save settings error:', e);
        Swal.fire("ผิดพลาด", "เชื่อมต่อไม่ได้", "error");
    }
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        Swal.fire('Error', 'เบราว์เซอร์ไม่รองรับ GPS', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        pos => {
            document.getElementById('lat').value = pos.coords.latitude;
            document.getElementById('lng').value = pos.coords.longitude;
            Swal.fire("สำเร็จ", "ดึงพิกัด GPS แล้ว", "success");
        },
        err => {
            console.error('GPS error:', err);
            Swal.fire('Error', 'ไม่สามารถดึงพิกัดได้ กรุณาเปิด GPS', 'error');
        }
    );
}