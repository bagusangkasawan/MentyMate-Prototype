document.addEventListener("DOMContentLoaded", function () {
    // Elements for Chatbot & Navbar
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");

    const navLinks = document.querySelectorAll(".navbar-nav .nav-link");
    const sections = document.querySelectorAll("section[id]"); // Sections for scrollspy
    const navbar = document.querySelector('.navbar.sticky-top'); // Target the main sticky navbar
    const navbarHeight = navbar ? navbar.offsetHeight : 70;
    const path = window.location.pathname;
    const isAtRootPage = path === '/MentyMate-Prototype' || path === '/MentyMate-Prototype/' || path.endsWith('/index.html');

    const chatbotModalElement = document.getElementById('chatbotModal');
    const chatbotNavLink = document.querySelector('.nav-link[data-bs-target="#chatbotModal"], .nav-link[href="#chatbotModal"]');

    // Chat history array
    let chatHistory = [];
    const CHAT_HISTORY_KEY = 'mentyMateChatHistory_session'; // Changed key slightly for clarity, though not strictly necessary

    // --- Helper function to escape HTML ---
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- Helper function to scroll chat to bottom ---
    function scrollChatToBottom() {
        if (chatBox) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    // --- Function to render a message to the DOM ---
    function renderMessageToDOM(sender, content, className, isMarkdown = false, isTyping = false) {
        if (!chatBox) return; 
        const messageElement = document.createElement("div");
        messageElement.className = className;

        const senderElement = document.createElement("strong");
        senderElement.textContent = sender + ":";

        const contentElement = document.createElement("span");
        if (isTyping) {
            // Special handling for typeText, content is the target element
            // typeText will populate this span
        } else {
            contentElement.innerHTML = isMarkdown && typeof marked !== 'undefined' ? (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(marked.parse(content)) : marked.parse(content)) : escapeHtml(content);
        }
        
        messageElement.appendChild(senderElement);
        messageElement.appendChild(document.createTextNode(" "));
        messageElement.appendChild(contentElement);

        chatBox.appendChild(messageElement);
        scrollChatToBottom();
        return contentElement; // Return contentElement for typeText
    }
    
    // --- Function to save chat history to sessionStorage ---
    function saveChatHistory() {
        try {
            sessionStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
        } catch (e) {
            console.error("Error saving chat history to sessionStorage:", e);
            // Optionally, inform the user that history might not be saved
        }
    }

    // --- Function to load chat history from sessionStorage ---
    function loadChatHistory() {
        if (!chatBox) return;
        try {
            const storedHistory = sessionStorage.getItem(CHAT_HISTORY_KEY);
            if (storedHistory) {
                chatHistory = JSON.parse(storedHistory);
                chatHistory.forEach(msg => {
                    renderMessageToDOM(msg.sender, msg.content, msg.className, msg.isMarkdown);
                });
            }
        } catch (e) {
            console.error("Error loading chat history from sessionStorage:", e);
            chatHistory = []; // Reset history if loading fails
        }
        scrollChatToBottom();
    }
    
    // --- Function to add a message to history, save, and render ---
    function addMessageToChat(sender, content, className, isMarkdown = false, isAI = false) {
        const messageData = { sender, content, className, isMarkdown };
        
        if (!isAI) { 
            chatHistory.push(messageData);
            saveChatHistory();
            renderMessageToDOM(sender, content, className, isMarkdown);
        } else {
            const contentElement = renderMessageToDOM(sender, "", className, isMarkdown, true); 
            typeText(contentElement, content, 10, () => {
                const finalMessageData = { sender, content, className, isMarkdown };
                chatHistory.push(finalMessageData);
                saveChatHistory();
            });
        }
    }


    // --- Function to simulate typing text effect ---
    function typeText(element, text, speed = 10, onCompleteCallback) {
        const isMarkdownContent = element.closest('.ai-message') !== null; 
        const html = isMarkdownContent && typeof marked !== 'undefined' ? (typeof DOMPurify !== 'undefined' ? DOMPurify.sanitize(marked.parse(text)) : marked.parse(text)) : escapeHtml(text);

        let i = 0;
        function typeChar() {
            if (i < html.length) {
                element.innerHTML = html.substring(0, i + 1); 
                scrollChatToBottom();
                i++;
                setTimeout(typeChar, speed);
            } else {
                element.innerHTML = html; 
                scrollChatToBottom();
                if (onCompleteCallback) {
                    onCompleteCallback();
                }
            }
        }
        typeChar();
    }

    // --- Function to fetch AI response ---
    function fetchAIResponse(message) {
        if (!chatBox) return; 
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "chat-message ai-message";
        const loadingSender = document.createElement("strong");
        loadingSender.textContent = "MentyMate:";
        const loadingDots = document.createElement("div");
        loadingDots.className = "loading-dots"; 
        loadingDots.innerHTML = "<span></span><span></span><span></span>";
        loadingMsg.appendChild(loadingSender);
        loadingMsg.appendChild(document.createTextNode(" "));
        loadingMsg.appendChild(loadingDots);
        chatBox.appendChild(loadingMsg);
        scrollChatToBottom();

        fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        })
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            if (chatBox.contains(loadingMsg)) {
                chatBox.removeChild(loadingMsg);
            }
            const cleanedResponse = data.reply; 
            addMessageToChat("MentyMate", cleanedResponse, "chat-message ai-message", true, true); 
        })
        .catch(err => {
            if (chatBox.contains(loadingMsg)) {
                chatBox.removeChild(loadingMsg);
            }
            addMessageToChat("MentyMate", "Maaf, terjadi kesalahan. Silakan coba lagi nanti.", "chat-message ai-message error-message", false);
            console.error("Error fetching AI response:", err);
        });
    }

    // --- Function to send a message ---
    function sendMessage() {
        if (!userInput || !chatBox) return; 
        const message = userInput.value.trim();
        if (message === "") return;

        addMessageToChat("Kamu", message, "chat-message user-message", false); 

        userInput.value = ""; 
        if (userInput.tagName === 'TEXTAREA') {
            userInput.style.height = "auto";
            userInput.style.overflowY = "hidden";
        }
        fetchAIResponse(message); 
    }

    // --- Chatbot Event Listeners ---
    if (sendButton) {
        sendButton.addEventListener("click", sendMessage);
    }
    if (userInput) {
        userInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); 
                sendMessage();
            }
        });
        if (userInput.tagName === 'TEXTAREA') {
            userInput.addEventListener("input", function() {
                userInput.style.height = "auto"; 
                let scrollHeight = userInput.scrollHeight;
                const maxHeight = parseInt(window.getComputedStyle(userInput).lineHeight) * 4; 
                if (scrollHeight > maxHeight) {
                    userInput.style.height = maxHeight + "px";
                    userInput.style.overflowY = "auto";
                } else {
                    userInput.style.height = scrollHeight + "px";
                    userInput.style.overflowY = "hidden";
                }
            });
        }
    }
    
    if (chatBox) { 
        loadChatHistory();
    }

    function updateActiveNavLink() {
        const chatbotModalIsOpen = chatbotModalElement && chatbotModalElement.classList.contains('show');

        if (chatbotModalIsOpen && chatbotNavLink) {
            navLinks.forEach(nav => nav.classList.remove('active'));
            chatbotNavLink.classList.add('active');
            return;
        }

        if (sections.length > 0 && isAtRootPage) {
            changeNavOnScroll(); 
        } else {
            let pageLinkActivated = false;
            navLinks.forEach(link => {
                if (link === chatbotNavLink) { 
                    link.classList.remove('active'); 
                    return;
                }
                const linkUrl = new URL(link.href, window.location.origin);
                const currentUrl = new URL(window.location.href, window.location.origin);
                if (linkUrl.pathname === currentUrl.pathname && !link.hash && !link.getAttribute('data-bs-toggle')) {
                    navLinks.forEach(nav => { if (nav !== chatbotNavLink) nav.classList.remove('active'); });
                    link.classList.add('active');
                    pageLinkActivated = true;
                }
            });
            if (!pageLinkActivated && isAtRootPage) {
                const homeLink = document.querySelector('.navbar-nav .nav-link[href="#home"], .navbar-nav .nav-link[href="/#home"]');
                if (homeLink && !homeLink.getAttribute('data-bs-toggle') && homeLink !== chatbotNavLink) {
                    navLinks.forEach(nav => {
                        if (nav !== homeLink && nav !== chatbotNavLink) {
                            nav.classList.remove('active');
                        }
                    });
                    homeLink.classList.add('active');
                }
            }
        }
    }

    function changeNavOnScroll() {
        if (chatbotModalElement && chatbotModalElement.classList.contains('show') && chatbotNavLink) {
            navLinks.forEach(nav => {
                if (nav !== chatbotNavLink) nav.classList.remove('active');
            });
            if (chatbotNavLink && !chatbotNavLink.classList.contains('active')) chatbotNavLink.classList.add('active');
            return;
        }

        let currentSectionId = "";
        let bottomPage = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 2; 

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (pageYOffset >= sectionTop - navbarHeight - 20 && pageYOffset < sectionTop + sectionHeight - navbarHeight - 20) {
                 currentSectionId = section.getAttribute("id");
            }
        });
        
        if (bottomPage && sections.length > 0) {
            const lastSection = sections[sections.length - 1];
            const lastSectionTop = lastSection.offsetTop;
            if (pageYOffset + window.innerHeight > lastSectionTop - navbarHeight - 20) { 
                 currentSectionId = lastSection.getAttribute("id");
            }
        }

        let activeLinkSetByScroll = false;
        navLinks.forEach(link => {
            if (link === chatbotNavLink) return; 
            link.classList.remove("active");
            if (link.hash && link.hash.substring(1) === currentSectionId) {
                link.classList.add("active");
                activeLinkSetByScroll = true;
            }
        });

        if (!activeLinkSetByScroll && isAtRootPage) {
            const homeLink = document.querySelector('.navbar-nav .nav-link[href="#home"], .navbar-nav .nav-link[href="/#home"]');
            if (homeLink && !homeLink.getAttribute('data-bs-toggle') && homeLink !== chatbotNavLink) {
                let anotherLinkIsActive = false;
                navLinks.forEach(nav => {
                    if (nav.classList.contains('active') && nav !== homeLink && nav !== chatbotNavLink) {
                        anotherLinkIsActive = true;
                    }
                });
                if (!anotherLinkIsActive) {
                    navLinks.forEach(nav => {
                        if (nav !== homeLink && nav !== chatbotNavLink) {
                           nav.classList.remove('active');
                        }
                    });
                    homeLink.classList.add('active');
                }
            }
        }
    }

    if (chatbotModalElement && chatbotNavLink) {
        chatbotModalElement.addEventListener('shown.bs.modal', () => {
            if (chatBox && chatBox.innerHTML === '' && chatHistory.length > 0) {
                 chatHistory.forEach(msg => {
                    renderMessageToDOM(msg.sender, msg.content, msg.className, msg.isMarkdown);
                });
            }
            navLinks.forEach(nav => {
                if (nav !== chatbotNavLink) {
                    nav.classList.remove('active');
                }
            });
            chatbotNavLink.classList.add('active');
            scrollChatToBottom(); 
            const modalChatInput = chatbotModalElement.querySelector('#user-input') || chatbotModalElement.querySelector('.chat-input');
            if (modalChatInput) {
                modalChatInput.focus();
            } else if (userInput) { 
                userInput.focus(); 
            }
        });
        chatbotModalElement.addEventListener('hidden.bs.modal', () => {
            if (chatbotNavLink) {
                chatbotNavLink.classList.remove('active');
            }
            updateActiveNavLink(); 
        });
    }

    navLinks.forEach(link => {
        link.addEventListener("click", function (e) {
            const isChatbotTrigger = (chatbotNavLink && this === chatbotNavLink) || this.getAttribute('data-bs-target') === '#chatbotModal';
            if (isChatbotTrigger) {
                return;
            }
            const linkUrl = new URL(this.href, window.location.origin);
            if (this.hash !== "" && document.querySelector(this.hash) && linkUrl.pathname === window.location.pathname) {
                e.preventDefault();
                const targetElement = document.querySelector(this.hash);
                if (targetElement) {
                    const elementPosition = targetElement.offsetTop;
                    window.scrollTo({
                        top: elementPosition - navbarHeight,
                        behavior: "smooth"
                    });
                }
            }
        });
    });

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function () {
            this.blur();
        });
    });

    if (sections.length > 0 && isAtRootPage) {
        window.addEventListener("scroll", changeNavOnScroll);
    }
    updateActiveNavLink(); 

    window.addEventListener('scroll', function() {
      if (navbar) { 
        if (window.scrollY > 50) {
          navbar.classList.add('shadow-sm');
        } else {
          navbar.classList.remove('shadow-sm');
        }
      }
    });

        const filterButtons = document.querySelectorAll('.filter-btn');
    const sidebarLinks = document.querySelectorAll('.sidebar-category');
    const blogCards = document.querySelectorAll('#blog-list .blog-card');

    function filterArticlesByCategory(category) {
      blogCards.forEach(card => {
        const categories = Array.from(card.querySelectorAll('.blog-category')).map(span => span.textContent.trim());
        const cardCol = card.closest('.col-md-6');
        if (category === 'Semua' || categories.includes(category)) {
          cardCol.style.display = 'block';
        } else {
          cardCol.style.display = 'none';
        }
      });

      // Atur active class di filterButtons
      filterButtons.forEach(btn => {
        if (btn.dataset.category === category) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });

      // Atur active class di sidebarLinks
      sidebarLinks.forEach(link => {
        if (link.dataset.category === category) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    // Untuk tombol filter atas
    filterButtons.forEach(button => {
      button.addEventListener('click', () => {
        const category = button.dataset.category;
        filterArticlesByCategory(category);
      });
    });

    // Untuk kategori di sidebar
    sidebarLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        const category = this.dataset.category;
        filterArticlesByCategory(category);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
    
    function showArticleByHref(button) {
      const targetId = button.getAttribute('href');
      const article = document.querySelector(targetId);
      const category = document.querySelector('.category-filter');
      const blogList = document.getElementById('blog-list');
      const sidebar = document.querySelector('.col-lg-4');
      const pagination = document.querySelector('.mt-5');

      if (article && blogList) {
        category.classList.add('d-none')
        blogList.classList.add('d-none');
        sidebar.classList.add('d-none');
        pagination.classList.add('d-none');
        
        document.querySelectorAll('section[id^="article-"]').forEach(item => item.classList.add('d-none'));
        article.classList.remove('d-none');

        // Optional: scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    // Untuk tombol "Baca Selengkapnya"
    document.querySelectorAll('.btn.btn-sm.btn-primary-custom').forEach(button => {
      button.addEventListener('click', function (e) {
        e.preventDefault();
        showArticleByHref(this);
      });
    });

    // Untuk tombol "Artikel Populer" juga
    document.querySelectorAll('.sidebar-list a').forEach(link => {
      // Pastikan ini tidak konflik dengan link kategori sidebar yang sudah punya event listener
      if (!link.classList.contains('sidebar-category')) { 
        link.addEventListener('click', function (e) {
          e.preventDefault();
          showArticleByHref(this);
        });
      }
    });

    // Tombol kembali ke blog
    document.querySelectorAll('.back-to-blog').forEach(button => {
      button.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector('.category-filter').classList.remove('d-none');
        document.getElementById('blog-list').classList.remove('d-none');
        document.querySelector('.col-lg-4').classList.remove('d-none');
        document.querySelector('.mt-5').classList.remove('d-none');
        document.querySelectorAll('section[id^="article-"]').forEach(article => {
          article.classList.add('d-none');
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });

    document.addEventListener('DOMContentLoaded', () => {
      window.scrollTo(0, 0);
    });

    // --- Konfigurasi API ---
    const backendUrl = "https://mentalmate-backend.azurewebsites.net/";
    const API_BASE_URL = backendUrl + "/api";

    // --- Referensi Elemen DOM ---
    const loadingOverlay = document.getElementById('loadingOverlay');
    const authSection = document.getElementById('authSection');
    const appContentSection = document.getElementById('appContentSection');
    const loginView = document.getElementById('loginView');
    const registerView = document.getElementById('registerView');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Main App Views
    const checkInMainView = document.getElementById('checkInMainView');
    const editProfileView = document.getElementById('editProfileView');
    const groupView = document.getElementById('groupView');
    const groupChatView = document.getElementById('groupChatView');
    const recommendationView = document.getElementById('recommendationView');
    const historyView = document.getElementById('historyView');

    const welcomeMessage = document.getElementById('welcomeMessage');
    const logoutButton = document.getElementById('logoutButton');
    const logoutNavButtonContainer = document.getElementById('logoutNavButtonContainer');

    // Navigasi
    const showRegisterButton = document.getElementById('showRegisterButton');
    const showLoginButton = document.getElementById('showLoginButton');
    const showCheckinViewButton = document.getElementById('showCheckinViewButton');
    const showGroupViewButton = document.getElementById('showGroupViewButton');
    const showEditProfileButton = document.getElementById('showEditProfileButton');

    // Checkin
    const checkInForm = document.getElementById('checkInForm');
    const getRecommendationButton = document.getElementById('getRecommendationButton');
    const recommendationText = document.getElementById('recommendationText');
    const getHistoryButton = document.getElementById('getHistoryButton');
    const historyList = document.getElementById('historyList');

    // Edit Profil
    const editProfileForm = document.getElementById('editProfileForm');
    const editUsernameInput = document.getElementById('editUsername');
    const editPhoneInput = document.getElementById('editPhone');
    const editPasswordInput = document.getElementById('editPassword');
    const cancelEditProfileButton = document.getElementById('cancelEditProfileButton');

    // Grup & Chat
    const groupList = document.getElementById('groupList');
    const createGroupForm = document.getElementById('createGroupForm');
    const groupNameInput = document.getElementById('groupName');
    const backToGroupsButton = document.getElementById('backToGroupsButton');
    const groupChatTitle = document.getElementById('groupChatTitle');
    const chatMessagesContainer = document.getElementById('chatMessagesContainer');
    const groupChatForm = document.getElementById('groupChatForm');
    const chatGroupIdInput = document.getElementById('chatGroupId');
    const chatMessageInput = document.getElementById('chatMessageInput');

    // Modal Notifikasi & Konfirmasi
    const customModal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalActionButtons = document.getElementById('modalActionButtons');

    // Modal Edit Grup
    const editGroupModal = new bootstrap.Modal(document.getElementById('editGroupModal'));
    const editGroupFormModal = document.getElementById('editGroupFormModal');
    const editGroupIdInput = document.getElementById('editGroupIdInput');
    const editGroupNameInput = document.getElementById('editGroupNameInput');

    // Modal Kelola Anggota
    const manageMembersModalEl = document.getElementById('manageMembersModal');
    const manageMembersModal = new bootstrap.Modal(manageMembersModalEl);
    const manageMembersModalTitle = document.getElementById('manageMembersModalTitle');
    const memberList = document.getElementById('memberList');
    const addMemberFormInModal = document.getElementById('addMemberFormInModal');
    const addMemberModalGroupIdInput = document.getElementById('addMemberModalGroupId');
    const addMemberModalUsernameInput = document.getElementById('addMemberModalUsername');


    // --- State Aplikasi ---
    let currentUserToken = null;
    let currentUsername = null;
    let currentUserId = null;
    let currentUserPhone = null; // DIUBAH: Tambahkan state untuk nomor telepon
    let socket = null;
    let myGroups = []; // Cache group data

    // --- Fungsi Loading & Modal ---
    function showLoading() { if (loadingOverlay) loadingOverlay.classList.remove('d-none'); }
    function hideLoading() { if (loadingOverlay) loadingOverlay.classList.add('d-none'); }

    function showCustomModal(title, messageHtml) {
        modalTitle.textContent = title;
        modalMessage.innerHTML = messageHtml;
        modalActionButtons.innerHTML = `<button class="modal-close-button w-100 btn btn-primary-custom fw-semibold py-2 rounded">Tutup</button>`;
        customModal.classList.remove('d-none');
        document.querySelector('.modal-close-button').addEventListener('click', () => customModal.classList.add('d-none'));
    }

    function showConfirmationModal(title, messageHtml, onConfirm, onCancel = () => {}) {
        modalTitle.textContent = title;
        modalMessage.innerHTML = messageHtml;
        modalActionButtons.innerHTML = `
            <button id="confirmCancelButton" class="w-50 btn btn-outline-secondary">Batal</button>
            <button id="confirmActionButton" class="w-50 btn btn-danger">Ya, Lanjutkan</button>
        `;
        customModal.classList.remove('d-none');

        document.getElementById('confirmActionButton').addEventListener('click', () => {
            customModal.classList.add('d-none');
            onConfirm();
        });
        document.getElementById('confirmCancelButton').addEventListener('click', () => {
            customModal.classList.add('d-none');
            onCancel();
        });
    }

    function displayMessage(message, type = 'success') {
        modalTitle.textContent = type === 'success' ? 'Sukses' : 'Error';
        modalMessage.innerHTML = `<p>${message}</p>`;
        modalTitle.className = `fs-5 fw-bold mb-3 ${type === 'error' ? 'text-danger' : 'text-primary-custom'}`;
        modalActionButtons.innerHTML = `<button class="modal-close-button w-100 btn btn-primary-custom fw-semibold py-2 rounded">Tutup</button>`;
        customModal.classList.remove('d-none');
        document.querySelector('.modal-close-button').addEventListener('click', () => customModal.classList.add('d-none'));
    }

    // --- Navigasi View ---
    function showView(viewToShow) {
        const views = [checkInMainView, editProfileView, groupView, groupChatView, recommendationView, historyView];
        views.forEach(view => { if (view) view.classList.add('d-none'); });
        if (viewToShow) viewToShow.classList.remove('d-none');
    }

    // --- Panggilan API ---
    async function apiCall(endpoint, method = 'GET', body = null, requiresAuth = true) {
        showLoading();
        const headers = { 'Content-Type': 'application/json' };
        if (requiresAuth && currentUserToken) { headers['Authorization'] = `Bearer ${currentUserToken}`; }
        const config = { method, headers };
        if (body) config.body = JSON.stringify(body);
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            // DIUBAH: Mengembalikan data JSON bahkan jika responsnya bukan 200 OK untuk login
            // yang mungkin mengembalikan user data bersama token.
            if (method === 'POST' && endpoint.includes('login')) {
                return await response.json();
            }
            return response.status === 204 ? null : await response.json();
        } catch (error) {
            console.error('API Call Error:', error);
            displayMessage(`Error: ${error.message}`, 'error');
            throw error;
        } finally {
            hideLoading();
        }
    }

    // --- Update UI & Socket ---
    function updateUIForAuthState() {
        const isLoggedIn = !!currentUserToken;
        authSection.classList.toggle('d-none', isLoggedIn);
        appContentSection.classList.toggle('d-none', !isLoggedIn);
        logoutNavButtonContainer.classList.toggle('d-none', !isLoggedIn);
        if (isLoggedIn) {
            welcomeMessage.textContent = `Selamat datang kembali, ${currentUsername}!`;
            showView(checkInMainView);
            connectSocket();
        } else {
            loginView.classList.remove('d-none');
            registerView.classList.add('d-none');
            welcomeMessage.textContent = '';
            if(socket) { socket.disconnect(); socket = null; }
        }
    }

    function connectSocket() {
        if (socket || !currentUserId) return;
        socket = io(backendUrl);
        socket.on('connect', () => {
            console.log('Connected to Socket.IO server with id:', socket.id);
            socket.emit('registerUser', currentUserId);
            if (myGroups.length > 0) {
                socket.emit('joinGroupRooms', myGroups.map(g => g._id));
            }
        });

        socket.on('newGroupMessage', (message) => {
            if (groupChatView.classList.contains('d-none') === false && chatGroupIdInput.value === message.groupId) {
                appendMessage(message);
            }
            if (message.isSupportAlert && message.sender !== currentUserId) {
                let messageHtml = `<p>Halo, temanmu <b>${message.fromUser}</b> di grup ini sepertinya ${message.reasonForAlert}. Mungkin kamu bisa menyapanya?</p>`;
                if (message.supportUrl) {
                    messageHtml += `<a href="${message.supportUrl}" target="_blank" class="btn btn-success-custom w-100 mb-2"><i class="fab fa-whatsapp"></i> Sapa ${message.fromUser} di WhatsApp</a>`;
                }
                showCustomModal('Butuh Dukungan Teman', messageHtml);
            }
        });

        socket.on('disconnect', () => { console.log('Disconnected from Socket.IO server'); });
    }

    // --- Fungsi Autentikasi ---
    function parseJwt(token) { try { return JSON.parse(atob(token.split('.')[1])); } catch (e) { return null; } }

    // DIUBAH: Event listener untuk login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            // Asumsikan API login sekarang mengembalikan { token, user: { username, phone, id } }
            const data = await apiCall('/auth/login', 'POST', { username: e.target.username.value, password: e.target.password.value }, false);
            if (data && data.token) {
                currentUserToken = data.token;
                const decodedToken = parseJwt(data.token);
                currentUserId = decodedToken ? decodedToken.id : null;

                // Ambil data user dari respons
                if (data.user) {
                    currentUsername = data.user.username;
                    currentUserPhone = data.user.phone;
                } else {
                    // Fallback jika API tidak mengembalikan objek user
                    currentUsername = e.target.username.value;
                    currentUserPhone = null;
                }

                // Simpan semua data ke session storage
                sessionStorage.setItem('authToken', currentUserToken);
                sessionStorage.setItem('username', currentUsername);
                sessionStorage.setItem('userId', currentUserId);
                if (currentUserPhone) {
                    sessionStorage.setItem('userPhone', currentUserPhone);
                } else {
                    sessionStorage.removeItem('userPhone');
                }

                updateUIForAuthState();
                displayMessage('Login berhasil!');
            }
        } catch (error) { /* Ditangani di apiCall */ }
    });

    // DIUBAH: Event listener untuk logout
    logoutButton.addEventListener('click', () => {
        currentUserToken = null;
        currentUsername = null;
        currentUserId = null;
        currentUserPhone = null; // Hapus data telepon saat logout
        myGroups = [];
        sessionStorage.clear();
        updateUIForAuthState();
        displayMessage('Anda telah logout.');
    });

    // --- Navigasi View & Form Toggle ---
    showRegisterButton.addEventListener('click', () => { loginView.classList.add('d-none'); registerView.classList.remove('d-none'); });
    showLoginButton.addEventListener('click', () => { registerView.classList.add('d-none'); loginView.classList.remove('d-none'); });
    showCheckinViewButton.addEventListener('click', () => showView(checkInMainView));

    // DIUBAH: Event listener untuk menampilkan form edit profil
    showEditProfileButton.addEventListener('click', () => {
        showView(editProfileView);
        editUsernameInput.value = currentUsername;
        editPasswordInput.value = ''; // Selalu kosongkan field password

        // Cek apakah ada nomor telepon yang tersimpan
        if (currentUserPhone) {
            editPhoneInput.value = currentUserPhone;
            editPhoneInput.placeholder = ''; // Hapus placeholder jika ada data
        } else {
            editPhoneInput.value = '';
            // Tampilkan placeholder jika tidak ada data telepon
            editPhoneInput.placeholder = 'Kosongkan jika tidak ingin diisi';
        }
    });

    showGroupViewButton.addEventListener('click', () => { showView(groupView); fetchMyGroups(); });
    cancelEditProfileButton.addEventListener('click', () => showView(checkInMainView));
    backToGroupsButton.addEventListener('click', () => { showView(groupView); fetchMyGroups(); });

    // --- Fungsi Grup & Chat ---
    async function fetchMyGroups() {
        if (!currentUserToken) return;
        try {
            const data = await apiCall('/groups/my-groups');
            groupList.innerHTML = '';
            if (data && data.groups) {
                myGroups = data.groups;
                if(socket && socket.connected) socket.emit('joinGroupRooms', myGroups.map(g => g._id));

                if(myGroups.length > 0) {
                    myGroups.forEach(group => {
                        const isCreator = group.creator._id === currentUserId;
                        const membersList = group.members.map(m => m.username === currentUsername ? `<b>${m.username} (Anda)</b>` : m.username).join(', ');

                        let dropdownMenu = '';
                        if (isCreator) {
                            dropdownMenu = `
                                <li><a class="dropdown-item edit-group-btn" href="#" data-group-id="${group._id}" data-group-name="${group.name}">Edit Grup</a></li>
                                <li><a class="dropdown-item manage-members-btn" href="#" data-group-id="${group._id}">Kelola Anggota</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger delete-group-btn" href="#" data-group-id="${group._id}" data-group-name="${group.name}">Hapus Grup</a></li>
                            `;
                        } else {
                            dropdownMenu = `<li><a class="dropdown-item text-danger leave-group-btn" href="#" data-group-id="${group._id}" data-group-name="${group.name}">Keluar dari Grup</a></li>`;
                        }

                        const groupCard = document.createElement('div');
                        groupCard.className = 'card mb-3 group-card';
                        groupCard.innerHTML = `
                            <div class="card-body d-flex justify-content-between align-items-center">
                                <div class="group-card-body clickable flex-grow-1" data-group-id="${group._id}" data-group-name="${group.name}">
                                    <h5 class="card-title mb-1">${group.name}</h5>
                                    <h6 class="card-subtitle mb-2 text-muted small">Dibuat oleh: ${group.creator.username}</h6>
                                    <p class="card-text small mb-0">Anggota: ${membersList}</p>
                                </div>
                                <div class="dropdown">
                                    <button class="btn btn-light btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i class="fas fa-ellipsis-v"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        ${dropdownMenu}
                                    </ul>
                                </div>
                            </div>`;
                        groupList.appendChild(groupCard);
                    });
                } else {
                    groupList.innerHTML = '<p>Anda belum bergabung dengan grup manapun.</p>';
                }
            }
        } catch (error) { groupList.innerHTML = '<p class="text-danger">Gagal memuat grup.</p>'; }
    }

    createGroupForm.addEventListener('submit', async (e) => { e.preventDefault(); const name = groupNameInput.value.trim(); if (!name) return; try { await apiCall('/groups', 'POST', { name }); displayMessage('Grup berhasil dibuat!'); groupNameInput.value = ''; fetchMyGroups(); } catch (error) { /* Ditangani di apiCall */ } });

    groupList.addEventListener('click', (e) => {
        const target = e.target;
        const groupCardBody = target.closest('.group-card-body');

        if (groupCardBody) { openGroupChat(target.closest('.group-card-body').dataset.groupId, target.closest('.group-card-body').dataset.groupName);
        } else if (target.matches('.edit-group-btn')) { e.preventDefault(); handleEditGroup(target.dataset.groupId, target.dataset.groupName);
        } else if (target.matches('.delete-group-btn')) { e.preventDefault(); handleDeleteGroup(target.dataset.groupId, target.dataset.groupName);
        } else if (target.matches('.leave-group-btn')) { e.preventDefault(); handleLeaveGroup(target.dataset.groupId, target.dataset.groupName);
        } else if (target.matches('.manage-members-btn')) { e.preventDefault(); openManageMembersModal(target.dataset.groupId); }
    });

    function handleEditGroup(groupId, currentName) {
        editGroupIdInput.value = groupId;
        editGroupNameInput.value = currentName;
        editGroupModal.show();
    }

    editGroupFormModal.addEventListener('submit', async function(e) {
        e.preventDefault();
        const groupId = editGroupIdInput.value;
        const newName = editGroupNameInput.value.trim();
        if (!newName) return;
        try {
            await apiCall(`/groups/${groupId}`, 'PUT', { name: newName });
            displayMessage('Nama grup berhasil diubah.');
            editGroupModal.hide();
            fetchMyGroups();
        } catch (error) { /* Ditangani di apiCall */ }
    });

    function handleDeleteGroup(groupId, groupName) {
        const message = `<p>Apakah Anda yakin ingin menghapus grup <strong>${groupName}</strong>? Semua riwayat chat akan hilang dan tindakan ini tidak dapat diurungkan.</p>`;
        showConfirmationModal('Konfirmasi Hapus Grup', message, async () => {
            try {
                await apiCall(`/groups/${groupId}`, 'DELETE');
                displayMessage('Grup berhasil dihapus.');
                fetchMyGroups();
            } catch (error) { /* Ditangani di apiCall */ }
        });
    }

    function handleLeaveGroup(groupId, groupName) {
        const message = `<p>Apakah Anda yakin ingin keluar dari grup <strong>${groupName}</strong>?</p>`;
        showConfirmationModal('Konfirmasi Keluar Grup', message, async () => {
            try {
                await apiCall(`/groups/${groupId}/leave`, 'POST');
                displayMessage('Anda telah keluar dari grup.');
                fetchMyGroups();
            } catch (error) { /* Ditangani di apiCall */ }
        });
    }

    function renderMemberList(group) {
        memberList.innerHTML = '';
        group.members.forEach(member => {
            const isCreator = member._id === group.creator._id;
            const memberItem = document.createElement('li');
            memberItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            memberItem.innerHTML = `
                <span><i class="fas fa-user me-2"></i>${member.username} ${isCreator ? '<span class="badge bg-primary-custom ms-2">Creator</span>' : ''}</span>
                ${!isCreator ? `<button class="btn btn-outline-danger btn-sm remove-member-btn" data-group-id="${group._id}" data-member-id="${member._id}" data-member-name="${member.username}">Keluarkan</button>` : ''}
            `;
            memberList.appendChild(memberItem);
        });
    }

    function openManageMembersModal(groupId) {
        const group = myGroups.find(g => g._id === groupId);
        if (!group) return;
        manageMembersModalTitle.textContent = `Kelola Anggota: ${group.name}`;
        addMemberModalGroupIdInput.value = groupId;
        renderMemberList(group);
        manageMembersModal.show();
    }

    addMemberFormInModal.addEventListener('submit', async (e) => {
        e.preventDefault();
        const groupId = addMemberModalGroupIdInput.value;
        const username = addMemberModalUsernameInput.value.trim();
        if (!groupId || !username) return;
        try {
            manageMembersModal.hide();
            await apiCall(`/groups/${groupId}/members`, 'POST', { username });
            displayMessage(`Anggota ${username} berhasil ditambahkan!`);

            await fetchMyGroups();
            const updatedGroup = myGroups.find(g => g._id === groupId);
            if(updatedGroup) {
                document.getElementById('customModal').addEventListener('hidden.bs.modal', () => {
                    openManageMembersModal(groupId);
                }, { once: true });
            }

        } catch(error) {
            document.getElementById('customModal').addEventListener('hidden.bs.modal', () => {
                manageMembersModal.show();
            }, { once: true });
        }
    });

    memberList.addEventListener('click', function(e) {
        if (e.target.matches('.remove-member-btn')) {
            const { groupId, memberId, memberName } = e.target.dataset;
            const message = `<p>Apakah Anda yakin ingin mengeluarkan <strong>${memberName}</strong> dari grup?</p>`;

            manageMembersModal.hide();

            showConfirmationModal('Konfirmasi Keluarkan Anggota', message,
                async () => {
                    try {
                        await apiCall(`/groups/${groupId}/members/${memberId}`, 'DELETE');
                        displayMessage(`${memberName} berhasil dikeluarkan.`);
                        await fetchMyGroups();

                        document.getElementById('customModal').addEventListener('hidden.bs.modal', () => {
                            openManageMembersModal(groupId);
                        }, { once: true });

                    } catch(error) {
                        document.getElementById('customModal').addEventListener('hidden.bs.modal', () => {
                            openManageMembersModal(groupId);
                        }, { once: true });
                    }
                },
                () => {
                    manageMembersModal.show();
                }
            );
        }
    });

    async function openGroupChat(groupId, groupName) {
        showView(groupChatView);
        groupChatTitle.textContent = `Chat Grup: ${groupName}`;
        chatGroupIdInput.value = groupId;
        chatMessagesContainer.innerHTML = '<p class="text-center text-muted">Memuat pesan...</p>';
        try {
            const messages = await apiCall(`/groups/${groupId}/messages`);
            chatMessagesContainer.innerHTML = '';
            messages.forEach(appendMessage);
        } catch (error) {
            chatMessagesContainer.innerHTML = '<p class="text-center text-danger">Gagal memuat pesan.</p>';
        }
    }

    function appendMessage(message) {
        const isSystemMessage = message.username === 'Sistem';
        if (isSystemMessage && message.sender === currentUserId) return;
        const messageDiv = document.createElement('div');
        const messageType = isSystemMessage ? 'system' : (message.sender === currentUserId ? 'sent' : 'received');
        messageDiv.className = `chat-message ${messageType}`;
        let sentAt = '';
        if (message.createdAt) { const dateObj = new Date(message.createdAt); if (!isNaN(dateObj.getTime())) sentAt = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
        if (isSystemMessage) { messageDiv.innerHTML = `<div class="message-text">${message.text}</div>`;
        } else { messageDiv.innerHTML = ` ${messageType === 'received' ? `<div class="sender-name">${message.username}</div>` : ''} <div class="message-text">${message.text}</div> <div class="timestamp">${sentAt}</div> `; }
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    }

    groupChatForm.addEventListener('submit', (e) => { e.preventDefault(); const text = chatMessageInput.value.trim(); const groupId = chatGroupIdInput.value; if (!text || !groupId || !socket) return; const messageData = { groupId, sender: currentUserId, username: currentUsername, text }; socket.emit('sendGroupMessage', messageData); chatMessageInput.value = ''; });

    // --- Fungsi Lainnya ---
    registerForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await apiCall('/auth/register', 'POST', { username: e.target.username.value, password: e.target.password.value, phone: e.target.phone.value }, false); displayMessage('Registrasi berhasil! Silakan login.'); registerForm.reset(); if (showLoginButton) showLoginButton.click(); } catch (error) { /* Ditangani di apiCall */ } });

    // DIUBAH: Event listener untuk submit form edit profil
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = editUsernameInput.value.trim();
        const newPassword = editPasswordInput.value;
        const newPhone = editPhoneInput.value.trim();
        const body = {};

        // Hanya tambahkan data ke body jika ada perubahan
        if (newUsername && newUsername !== currentUsername) {
            body.username = newUsername;
        }
        if (newPassword) {
            body.password = newPassword;
        }
        if (newPhone !== (currentUserPhone || '')) {
            body.phone = newPhone;
        }

        if (Object.keys(body).length === 0) {
            displayMessage('Tidak ada data yang diubah.', 'error');
            return;
        }

        try {
            // Asumsikan API update mengembalikan data user yang telah diperbarui
            const data = await apiCall('/auth/update-profile', 'PUT', body);
            if (data && data.user) {
                displayMessage(data.message || 'Profil berhasil diperbarui!');

                // Perbarui state dan session storage
                currentUsername = data.user.username;
                currentUserPhone = data.user.phone;
                sessionStorage.setItem('username', currentUsername);
                if (currentUserPhone) {
                    sessionStorage.setItem('userPhone', currentUserPhone);
                } else {
                    sessionStorage.removeItem('userPhone');
                }

                if(welcomeMessage) welcomeMessage.textContent = `Selamat datang kembali, ${currentUsername}!`;
                showView(checkInMainView);
            }
        } catch (error) { /* Ditangani di apiCall */ }
    });

    checkInForm.addEventListener('submit', async (e) => { e.preventDefault(); try { await apiCall('/checkin', 'POST', { mood: e.target.mood.value, description: e.target.description.value }); displayMessage('Check-in berhasil disimpan!'); checkInForm.reset(); await fetchRecommendation(); showView(recommendationView); } catch (error) { /* Ditangani di apiCall */ } });
    getRecommendationButton.addEventListener('click', async () => { try { await fetchRecommendation(); if (recommendationText && recommendationText.innerHTML && !recommendationText.textContent.includes('Gagal memuat')) { showView(recommendationView); } } catch (error) { /* Ditangani di apiCall */ } });
    getHistoryButton.addEventListener('click', async () => { try { await fetchHistory(); if (historyList && historyList.innerHTML && !historyList.textContent.includes('Gagal memuat')) { showView(historyView); } } catch (error) { /* Ditangani di apiCall */ } });
    async function fetchRecommendation() { if (!currentUserToken) { displayMessage('Anda harus login untuk mendapatkan rekomendasi.', 'error'); if(recommendationText) recommendationText.innerHTML = '<p>Silakan login terlebih dahulu.</p>'; return; } try { const data = await apiCall('/checkin/recommendation'); if (data && data.recommendation) { if(recommendationText && typeof marked !== 'undefined') { recommendationText.innerHTML = marked.parse(data.recommendation); } else if (recommendationText) { recommendationText.textContent = data.recommendation; } } else { if(recommendationText) recommendationText.innerHTML = '<p>Tidak ada rekomendasi terbaru untuk Anda. Silakan lakukan check-in terlebih dahulu.</p>'; } } catch (error) { if(recommendationText) recommendationText.innerHTML = '<p class="text-danger">Gagal memuat rekomendasi.</p>'; } }
    async function fetchHistory() { if (!currentUserToken) { displayMessage('Anda harus login untuk melihat riwayat.', 'error'); if(historyList) historyList.innerHTML = '<p style="color: var(--dark-text);">Silakan login terlebih dahulu.</p>'; return; } try { const data = await apiCall('/checkin'); if(historyList) historyList.innerHTML = ''; if (data && data.length > 0) { data.sort((a, b) => new Date(b.date) - new Date(a.date)); data.forEach(item => { const itemDiv = document.createElement('div'); itemDiv.className = 'history-item'; const moodText = item.mood.charAt(0).toUpperCase() + item.mood.slice(1); let moodEmoji = ''; if (item.mood === 'baik') moodEmoji = '😊'; else if (item.mood === 'sedang') moodEmoji = '😐'; else if (item.mood === 'buruk') moodEmoji = '😟'; itemDiv.innerHTML = ` <p class="fw-semibold mb-1" style="color: var(--dark-text);">Tanggal: <span class="fw-normal">${new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour:'2-digit', minute:'2-digit' })}</span></p> <p class="fw-semibold mb-1" style="color: var(--dark-text);">Mood: <span class="fw-normal">${moodText} ${moodEmoji}</span></p> <p class="fw-semibold mb-0" style="color: var(--dark-text);">Deskripsi: <span class="fw-normal">${item.description || '-'}</span></p> `; if(historyList) historyList.appendChild(itemDiv); }); } else { if(historyList) historyList.innerHTML = '<p style="color: var(--dark-text);">Belum ada riwayat check-in.</p>'; } } catch (error) { if(historyList) historyList.innerHTML = '<p class="text-danger">Gagal memuat riwayat check-in.</p>'; } }

    // --- Inisialisasi Aplikasi ---
    // DIUBAH: Inisialisasi aplikasi saat DOM dimuat
    window.addEventListener('DOMContentLoaded', () => {
        currentUserToken = sessionStorage.getItem('authToken');
        currentUsername = sessionStorage.getItem('username');
        currentUserId = sessionStorage.getItem('userId');
        currentUserPhone = sessionStorage.getItem('userPhone'); // Ambil data telepon dari session
        updateUIForAuthState();
    });
});
