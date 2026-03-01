// Script to handle interactive elements such as scroll animations and mobile navigation

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            // Toggle icon between bars and times
            const icon = mobileMenuBtn.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }

    // 2. Navbar Scroll Effect
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 3. Scroll Animation using Intersection Observer
    const faders = document.querySelectorAll('.fade-in');

    const appearOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const appearOnScroll = new IntersectionObserver(function (entries, observer) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                return;
            } else {
                entry.target.classList.add('appear');
                observer.unobserve(entry.target);
            }
        });
    }, appearOptions);

    faders.forEach(fader => {
        appearOnScroll.observe(fader);
    });

    // 4. Mood Tracker Logic
    const moodBtns = document.querySelectorAll('.mood-btn');
    const journalInput = document.getElementById('journal-notes');
    const saveMoodBtn = document.getElementById('save-mood-btn');
    const historyList = document.getElementById('mood-history-list');

    if (moodBtns.length > 0 && saveMoodBtn && historyList) {
        let selectedMood = null;
        let selectedColor = null;
        let selectedIcon = null;

        // Select Mood
        moodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all buttons
                moodBtns.forEach(b => b.classList.remove('active'));
                // Add active to the clicked button
                btn.classList.add('active');

                selectedMood = btn.dataset.mood;
                selectedColor = btn.dataset.color;
                selectedIcon = btn.dataset.icon;
            });
        });

        // Load and Parse History
        const loadHistory = () => {
            const history = JSON.parse(localStorage.getItem('moodHistory')) || [];
            historyList.innerHTML = '';

            if (history.length === 0) {
                historyList.innerHTML = '<p class="empty-history">Belum ada catatan perasaan. Mulai hari ini yuk, Bu!</p>';
                return;
            }

            history.forEach(item => {
                const dateObj = new Date(item.date);
                const dateStr = dateObj.toLocaleDateString('id-ID', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                const historyItem = document.createElement('div');
                historyItem.className = 'history-item fade-in appear';

                // Set color dynamic class if custom-orange-bg
                const colorClass = item.color === 'custom-orange-bg' ? 'custom-orange-bg' : item.color;

                historyItem.innerHTML = `
                    <div class="history-icon ${colorClass}">
                        <i class="fa-solid ${item.icon}"></i>
                    </div>
                    <div class="history-content">
                        <div class="history-header-mini">
                            <span class="history-mood-name">${item.mood}</span>
                            <span class="history-date">${dateStr}</span>
                        </div>
                        ${item.journal ? `<p class="history-journal">"${item.journal}"</p>` : ''}
                    </div>
                `;
                historyList.appendChild(historyItem);
            });
        };

        // Save Mood
        saveMoodBtn.addEventListener('click', () => {
            if (!selectedMood) {
                alert('Silakan pilih perasaan Ibu hari ini terlebih dahulu.');
                return;
            }

            const journalText = journalInput.value.trim();
            const newEntry = {
                mood: selectedMood,
                color: selectedColor,
                icon: selectedIcon,
                journal: journalText,
                date: new Date().toISOString()
            };

            const history = JSON.parse(localStorage.getItem('moodHistory')) || [];
            history.unshift(newEntry); // Add newest at the top
            localStorage.setItem('moodHistory', JSON.stringify(history));

            // Reset Form Selection
            moodBtns.forEach(b => b.classList.remove('active'));
            selectedMood = null;
            selectedColor = null;
            selectedIcon = null;
            journalInput.value = '';

            // Show Success & Reload List
            alert('Catatan perasaan berhasil disimpan! Terima kasih sudah bercerita.');
            loadHistory();
        });

        // Initial Load
        loadHistory();
    }
});
