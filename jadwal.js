// jadwal.js - Logika untuk fitur Jadwal dan Pengingat

document.addEventListener('DOMContentLoaded', () => {
    // === Elemen Manajemen Profil Bayi ===
    const babyNameInput = document.getElementById('baby-name');
    const babyDobInput = document.getElementById('baby-dob');
    const saveProfileBtn = document.getElementById('save-baby-profile');
    const babyAgeDisplay = document.getElementById('baby-age-display');
    const timelineContainer = document.getElementById('immunization-timeline');

    // === Data Default Imunisasi (IDAI Dasar) ===
    const immunizationDB = [
        { ageMonths: 0, vaccines: ['Hepatitis B-1', 'Polio-0'], notes: 'Biasanya diberikan segera setelah lahir.' },
        { ageMonths: 1, vaccines: ['BCG', 'Polio-1'], notes: 'Mencegah tuberkulosis.' },
        { ageMonths: 2, vaccines: ['DPT-1', 'Polio-2', 'Hepatitis B-2', 'PCV-1', 'Rotavirus-1'], notes: 'Bisa memicu demam ringan.' },
        { ageMonths: 3, vaccines: ['DPT-2', 'Polio-3', 'Hepatitis B-3', 'PCV-2', 'Rotavirus-2'], notes: 'Penting untuk perlindungan difteri & pneumonia.' },
        { ageMonths: 4, vaccines: ['DPT-3', 'Polio-4', 'Hepatitis B-4', 'Rotavirus-3'], notes: 'Dosis ketiga DPT.' },
        { ageMonths: 6, vaccines: ['PCV-3', 'Influenza-1'], notes: 'Awal perlindungan influenza tiap tahun.' },
        { ageMonths: 9, vaccines: ['Campak/MR'], notes: 'Pencegahan campak dan rubella.' }
    ];

    // Format tanggal ke lokal Indonesia
    const formatDate = (date) => {
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    // === Logika Load dan Save Profil ===
    const loadBabyProfile = () => {
        const profile = JSON.parse(localStorage.getItem('babyProfile'));
        if (profile && profile.dob) {
            if (babyNameInput) babyNameInput.value = profile.name || '';
            if (babyDobInput) babyDobInput.value = profile.dob;
            generateTimeline(profile.dob);
        }
    };

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const name = babyNameInput.value.trim();
            const dob = babyDobInput.value;
            
            if (!dob) {
                alert('Tolong masukkan tanggal lahir si kecil, ya Bunda.');
                return;
            }

            const profile = { name, dob };
            localStorage.setItem('babyProfile', JSON.stringify(profile));
            
            showToast('Profil bayi berhasil disimpan!');
            generateTimeline(dob);
        });
    }

    // === Generate Timeline Imunisasi ===
    const generateTimeline = (dobString) => {
        const dobDate = new Date(dobString);
        const today = new Date();
        
        // Cek umur bayi saat ini dalam bulan
        let ageMonths = (today.getFullYear() - dobDate.getFullYear()) * 12;
        ageMonths -= dobDate.getMonth();
        ageMonths += today.getMonth();
        if (today.getDate() < dobDate.getDate()) {
            ageMonths--;
        }
        
        if (ageMonths < 0) ageMonths = 0; // Jika baru lahir
        
        babyAgeDisplay.textContent = `Usia: ${ageMonths} Bulan`;
        timelineContainer.innerHTML = ''; // Bersihkan kontainer

        // Ambil data jadwal booking dari localStorage
        const bookings = JSON.parse(localStorage.getItem('immunizationBookings')) || {};

        immunizationDB.forEach(item => {
            // Hitung estimasi tanggal (tanggal lahir + item.ageMonths bulan)
            const targetDate = new Date(dobDate);
            targetDate.setMonth(targetDate.getMonth() + item.ageMonths);
            
            // Tentukan status: lewat (past), bulan ini (current), akan datang (future)
            let statusClass = 'future';
            if (ageMonths > item.ageMonths) statusClass = 'past';
            else if (ageMonths === item.ageMonths) statusClass = 'current';

            const bookingKey = `vaksin-${item.ageMonths}`;
            const bookingData = bookings[bookingKey];
            
            let actionHtml = '';
            
            if (bookingData) {
                // Jika sudah ada jadwal
                actionHtml = `
                    <div class="booking-info">
                        <strong><i class="fa-regular fa-calendar-check"></i> Jadwal:</strong> ${formatDate(new Date(bookingData.date))} | Jam: ${bookingData.time} <br>
                        <strong><i class="fa-solid fa-hospital"></i> Lokasi:</strong> ${bookingData.clinic}
                        <button class="btn-text btn-edit-booking" data-id="${bookingKey}" data-vaccines="${item.vaccines.join(', ')}">Ubah Janji</button>
                    </div>
                `;
            } else if (statusClass !== 'past' || ageMonths === item.ageMonths) {
                // Jika belum ada jadwal dan belum terlalu lewat jauh
                actionHtml = `<button class="btn btn-outline btn-booking" data-id="${bookingKey}" data-vaccines="${item.vaccines.join(', ')}">Buat Janji Dokter</button>`;
            }

            const itemHtml = `
                <div class="timeline-item ${statusClass}">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-meta">
                            <span class="timeline-month">Usia ${item.ageMonths} Bulan</span>
                            <span class="timeline-date">Estimasi: ${formatDate(targetDate)}</span>
                        </div>
                        <h4 class="timeline-vaccines">${item.vaccines.join(', ')}</h4>
                        <p class="timeline-notes">${item.notes}</p>
                        ${actionHtml}
                    </div>
                </div>
            `;
            timelineContainer.insertAdjacentHTML('beforeend', itemHtml);
        });

        attachBookingEvents();
    };

    // === Logika Push Notifications (Web API) ===
    const requestNotificationPermission = () => {
        if (!("Notification" in window)) {
            console.log("Browser ini tidak mendukung notifikasi desktop");
            return;
        }
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    showToast("Notifikasi diaktifkan! Anda akan menerima pengingat.");
                }
            });
        }
    };

    const sendPushNotification = (title, body) => {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: 'https://cdn-icons-png.flaticon.com/512/2921/2921822.png', // Contoh icon bayi/ibu
                badge: 'https://cdn-icons-png.flaticon.com/512/2921/2921822.png'
            });
        }
    };

    // Panggil request di awal
    requestNotificationPermission();

    // === Logika Toast & Audio (Micro-Affirmation) ===
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    const notifSound = document.getElementById('notification-sound');
    
    const showToast = (message) => {
        if (!toast) return;
        toastMessage.textContent = message;
        toast.className = 'toast show';
        
        // Mainkan suara lembut
        if (notifSound) {
            notifSound.currentTime = 0;
            notifSound.play().catch(e => console.log("Audio play di-block browser sebelum ada interaksi:", e));
        }

        setTimeout(() => {
            toast.className = 'toast show hide';
            setTimeout(() => {
                toast.className = 'toast hidden';
            }, 300);
        }, 3000);
    };

    // === Logika Quick Logs ===
    const quickLogBtns = document.querySelectorAll('.quick-log-btn');
    quickLogBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Animasi tekan
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'translateY(-5px)';
                setTimeout(()=> this.style.transform = '', 200);
            }, 100);

            const msg = this.dataset.message;
            const action = this.dataset.action;
            
            showToast(msg);

            // Minta izin notifikasi jika belum (biasanya request butuh trigger user action)
            requestNotificationPermission();

            // Kirim push notification browser (akan muncul jika izin sudah diberikan)
            sendPushNotification("Catatan Tersimpan", msg);
        });
    });

    // === Logika Modal Buat Janji ===
    const bookingModal = document.getElementById('booking-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const saveBookingBtn = document.getElementById('save-booking-btn');
    
    const bkVaccineName = document.getElementById('booking-vaksin-name');
    const bkDate = document.getElementById('booking-date');
    const bkTime = document.getElementById('booking-time');
    const bkClinic = document.getElementById('booking-clinic');
    
    let currentBookingTargetId = null;

    const attachBookingEvents = () => {
        const bookBtns = document.querySelectorAll('.btn-booking, .btn-edit-booking');
        bookBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentBookingTargetId = e.target.dataset.id;
                const vaxName = e.target.dataset.vaccines;
                bkVaccineName.textContent = `Vaksin: ${vaxName}`;
                
                // Cek apakah ada data lama
                const bookings = JSON.parse(localStorage.getItem('immunizationBookings')) || {};
                const exist = bookings[currentBookingTargetId];
                if(exist) {
                    bkDate.value = exist.date;
                    bkTime.value = exist.time;
                    bkClinic.value = exist.clinic;
                } else {
                    bkDate.value = '';
                    bkTime.value = '';
                    bkClinic.value = '';
                }

                bookingModal.classList.remove('hidden');
                bookingModal.style.display = 'flex';
            });
        });
    };

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            bookingModal.classList.add('hidden');
            setTimeout(()=> bookingModal.style.display = 'none', 300);
        });
    }

    if (saveBookingBtn) {
        saveBookingBtn.addEventListener('click', () => {
            if(!bkDate.value || !bkTime.value) {
                alert('Tolong isi Tanggal dan Jam janji temu ya bun.');
                return;
            }

            const bookingData = {
                date: bkDate.value,
                time: bkTime.value,
                clinic: bkClinic.value || 'Klinik Anak'
            };

            const bookings = JSON.parse(localStorage.getItem('immunizationBookings')) || {};
            bookings[currentBookingTargetId] = bookingData;
            localStorage.setItem('immunizationBookings', JSON.stringify(bookings));

            bookingModal.classList.add('hidden');
            setTimeout(()=> bookingModal.style.display = 'none', 300);
            
            showToast('Jadwal berhasil disimpan! Kami akan mengingatkan bunda nanti.');
            
            // Jadwalkan Notifikasi (Konsep Sederhana Berbasis Timeout untuk Demo Web)
            // Dalam aplikasi sesungguhnya, ini butuh Service Worker (Background Sync) atau backend.
            // Di sini kita gunakan setTimeout dengan menghitung selisih waktu dari sekarang ke jadwal
            const scheduleDateTime = new Date(`${bkDate.value}T${bkTime.value}`);
            const now = new Date();
            const timeDiff = scheduleDateTime.getTime() - now.getTime();

            if (timeDiff > 0) {
                requestNotificationPermission();

                // 1. Notifikasi Hari H (Tepat pada Waktu Jadwal)
                setTimeout(() => {
                    sendPushNotification(
                        "Waktunya Imunisasi Bayi! 🩺", 
                        `Jadwal kontrol ke ${bookingData.clinic} jam ${bookingData.time} sudah tiba!`
                    );
                    showToast(`Waktunya ke ${bookingData.clinic} jam ${bookingData.time}!`);
                }, timeDiff);

                // 2. Notifikasi H-2 Jam (Persiapan)
                const twoHours = 2 * 60 * 60 * 1000;
                if (timeDiff > twoHours) {
                    setTimeout(() => {
                        sendPushNotification(
                            "Persiapan ke Dokter (H-2 Jam) ⏰", 
                            `Jadwal kontrol si kecil 2 jam lagi di ${bookingData.clinic}. Jangan lupa siapkan buku KIA dan perlengkapan bayi ya Bun!`
                        );
                    }, timeDiff - twoHours);
                }

                // 3. Notifikasi H-7 Hari (Pengingat Booking)
                const sevenDays = 7 * 24 * 60 * 60 * 1000;
                if (timeDiff > sevenDays) {
                    setTimeout(() => {
                        sendPushNotification(
                            "Pengingat Jadwal Klinik (H-7) 📅", 
                            `Minggu depan waktunya imunisasi/kontrol ke ${bookingData.clinic}. Jangan lupa buat janji dengan dokternya ya!`
                        );
                    }, timeDiff - sevenDays);
                }
            } else {
                alert("Perhatian: Anda mengatur waktu jadwal ke waktu yang sudah berlalu, sehingga notifikasi tidak akan berbunyi.");
            }

            const profile = JSON.parse(localStorage.getItem('babyProfile'));
            if(profile && profile.dob) {
                generateTimeline(profile.dob);
            }
        });
    }

    // Jalankan load profile saat pertama dimuat
    loadBabyProfile();
});
