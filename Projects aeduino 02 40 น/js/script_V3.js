// ===============================================
// Marine Check-in System - Frontend Script
// สำหรับนักเรียน: เช็คชื่อและแจ้งลา
// ===============================================

const API_URL = "https://script.google.com/macros/s/AKfycbyCIh1qeL5-ZWsklfBhd0UuSwRgJz-RpXh6qOug4ul1I3bcE2G1CPwz3x1nLSZxwBML/exec"; 

const video = document.getElementById('webcam');
const checkBtn = document.getElementById('checkBtn');
const leaveBtn = document.getElementById('leaveBtn');
const btnText = document.getElementById('btnText');
const yearSelect = document.getElementById("year");
const studentSelect = document.getElementById("student");

let isLoading = false;

// ===============================================
// 1. เปิดกล้อง
// ===============================================
navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
    .then(stream => video.srcObject = stream)
    .catch(() => Swal.fire('Error','กรุณาอนุญาตให้เข้าถึงกล้อง','error'));

// ===============================================
// 2. โหลดรายชื่อแยกตามปี
// ===============================================
yearSelect.addEventListener("change", async function() {
    const year = this.value;
    if (!year) return;
    
    studentSelect.innerHTML = '<option value="">⏳ กำลังโหลดรายชื่อ...</option>';
    
    try {
        const res = await fetch(`${API_URL}?action=getStudents`);
        const data = await res.json();
        
        studentSelect.innerHTML = '<option value="">-- เลือกชื่อของคุณ --</option>';
        
        if (data[year] && data[year].length > 0) {
            data[year].forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                studentSelect.appendChild(option);
            });
        } else {
            studentSelect.innerHTML = '<option value="">ไม่มีรายชื่อในชั้นปีนี้</option>';
        }
    } catch (e) {
        console.error('Error loading students:', e);
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
        studentSelect.innerHTML = '<option value="">เกิดข้อผิดพลาด</option>';
    }
});

// ===============================================
// 3. ระบบเช็คชื่อ (GPS + IP + Photo)
// ===============================================
checkBtn.onclick = async () => {
    if (isLoading) return;
    
    const year = yearSelect.value;
    const name = studentSelect.value;
    
    if (!year || !name) {
        return Swal.fire('แจ้งเตือน', 'กรุณาเลือกปีและรายชื่อ', 'warning');
    }

    setLoading(true);
    
    try {
        // ดึงพิกัด และ IP พร้อมกัน
        const [coords, ipRes] = await Promise.all([
            new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    position => resolve(position.coords),
                    error => reject("กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง")
                );
            }),
            fetch('https://api.ipify.org?format=json').then(r => r.json()).catch(() => ({ ip: 'Unknown' }))
        ]);

        // ถ่ายรูป
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 300;
        canvas.getContext("2d").drawImage(video, 0, 0, 400, 300);
        
        const params = new URLSearchParams();
        params.append("action", "checkIn");
        params.append("name", name);
        params.append("year", year);
        params.append("imageData", canvas.toDataURL("image/jpeg", 0.8));
        params.append("userIP", ipRes.ip);
        params.append("lat", coords.latitude);
        params.append("lng", coords.longitude);

        const response = await fetch(API_URL, { 
            method: "POST", 
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const result = await response.json();

        if (result.status === "success") {
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ!',
                text: result.message,
                confirmButtonText: 'ตกลง'
            }).then(() => {
                // รีเซ็ตฟอร์ม
                yearSelect.value = '';
                studentSelect.innerHTML = '<option value="">เลือกรายชื่อ</option>';
            });
        } else {
            Swal.fire('แจ้งเตือน', result.message || 'เกิดข้อผิดพลาด', 'error');
        }
    } catch (err) {
        console.error('Check-in error:', err);
        Swal.fire('ผิดพลาด', err.toString(), 'error');
    } finally {
        setLoading(false);
    }
};

// ===============================================
// 4. จัดการสถานะ Loading
// ===============================================
function setLoading(status) {
    isLoading = status;
    checkBtn.disabled = status;
    leaveBtn.disabled = status;
    
    if (status) {
        btnText.innerHTML = '<span class="spinner"></span> กำลังประมวลผล...';
        checkBtn.style.opacity = '0.6';
    } else {
        btnText.innerHTML = '🚀 เช็คชื่อเข้าแถว';
        checkBtn.style.opacity = '1';
    }
}

// ===============================================
// 5. ระบบแจ้งลา
// ===============================================
leaveBtn.onclick = async () => {
    const year = yearSelect.value;
    const name = studentSelect.value;
    
    if (!year || !name) {
        return Swal.fire('แจ้งเตือน', 'กรุณาเลือกปีและรายชื่อก่อน', 'warning');
    }

    const { value: formValues } = await Swal.fire({
        title: '📝 แจ้งลาเข้าแถว',
        html: `
            <input id="swal-reason" class="swal2-input" placeholder="ระบุเหตุผลการลา" style="width: 80%;">
            <input type="file" id="swal-file" class="swal2-file" accept="image/*" style="margin-top: 10px;">
        `,
        showCancelButton: true,
        confirmButtonText: 'ส่งใบลา',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            const reason = document.getElementById('swal-reason').value;
            const file = document.getElementById('swal-file').files[0];
            
            if (!reason) {
                Swal.showValidationMessage('กรุณาระบุเหตุผลการลา');
                return false;
            }
            
            return { reason, file };
        }
    });

    if (formValues && formValues.reason) {
        setLoading(true);
        
        try {
            let base64 = "";
            
            // แปลงไฟล์เป็น Base64 (ถ้ามี)
            if (formValues.file) {
                base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(formValues.file);
                });
            }
            
            const params = new URLSearchParams();
            params.append("action", "submitLeave");
            params.append("year", year);
            params.append("name", name);
            params.append("reason", formValues.reason);
            params.append("imageData", base64);

            const response = await fetch(API_URL, { 
                method: "POST", 
                body: params,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            
            const result = await response.json();
            
            if (result.status === "success") {
                Swal.fire({
                    icon: 'success',
                    title: 'สำเร็จ',
                    text: result.message || 'ส่งใบลาสำเร็จ',
                    confirmButtonText: 'ตกลง'
                }).then(() => {
                    yearSelect.value = '';
                    studentSelect.innerHTML = '<option value="">เลือกรายชื่อ</option>';
                });
            } else {
                Swal.fire('พลาด', result.message || 'เกิดข้อผิดพลาด', 'error');
            }
        } catch (err) {
            console.error('Leave submission error:', err);
            Swal.fire('ผิดพลาด', 'ไม่สามารถส่งใบลาได้', 'error');
        } finally {
            setLoading(false);
        }
    }
};