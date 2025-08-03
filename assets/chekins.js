document.addEventListener("DOMContentLoaded", function () {
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
    const editGroupModal = document.getElementById('editGroupModal')
        ? new bootstrap.Modal(document.getElementById('editGroupModal'))
        : null;
    const editGroupFormModal = document.getElementById('editGroupFormModal');
    const editGroupIdInput = document.getElementById('editGroupIdInput');
    const editGroupNameInput = document.getElementById('editGroupNameInput');

    // Modal Kelola Anggota
    const manageMembersModal = document.getElementById('manageMembersModal')
        ? new bootstrap.Modal(document.getElementById('manageMembersModal'))
        : null;
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

    checkInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await apiCall('/checkin', 'POST', {
            mood: e.target.mood.value,
            description: e.target.description.value
            });
            displayMessage('Check-in berhasil disimpan!');
            checkInForm.reset();
            await fetchRecommendation();
            showView(recommendationView);
        } catch (error) { /* Ditangani di apiCall */ }
    });

    getRecommendationButton.addEventListener('click', async () => {
        try {
            await fetchRecommendation();
            if (
            recommendationText &&
            recommendationText.innerHTML &&
            !recommendationText.textContent.includes('Gagal memuat')
            ) {
            showView(recommendationView);
            }
        } catch (error) { /* Ditangani di apiCall */ }
    });

    getHistoryButton.addEventListener('click', async () => {
        try {
            await fetchHistory();
            if (
            historyList &&
            historyList.innerHTML &&
            !historyList.textContent.includes('Gagal memuat')
            ) {
            showView(historyView);
            }
        } catch (error) { /* Ditangani di apiCall */ }
    });

    async function fetchRecommendation() {
        if (!currentUserToken) {
            displayMessage('Anda harus login untuk mendapatkan rekomendasi.', 'error');
            if (recommendationText)
            recommendationText.innerHTML = '<p>Silakan login terlebih dahulu.</p>';
            return;
        }

        try {
            const data = await apiCall('/checkin/recommendation');

            if (data && data.recommendation) {
            if (recommendationText && typeof marked !== 'undefined') {
                recommendationText.innerHTML = marked.parse(data.recommendation);
            } else if (recommendationText) {
                recommendationText.textContent = data.recommendation;
            }
            } else {
            if (recommendationText)
                recommendationText.innerHTML =
                '<p>Tidak ada rekomendasi terbaru untuk Anda. Silakan lakukan check-in terlebih dahulu.</p>';
            }
        } catch (error) {
            if (recommendationText)
            recommendationText.innerHTML =
                '<p class="text-danger">Gagal memuat rekomendasi.</p>';
        }
    }

    async function fetchHistory() {
        if (!currentUserToken) {
            displayMessage('Anda harus login untuk melihat riwayat.', 'error');
            if (historyList)
            historyList.innerHTML =
                '<p style="color: var(--dark-text);">Silakan login terlebih dahulu.</p>';
            return;
        }

        try {
            const data = await apiCall('/checkin');
            if (historyList) historyList.innerHTML = '';

            if (data && data.length > 0) {
            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            data.forEach((item) => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'history-item';

                const moodText = item.mood.charAt(0).toUpperCase() + item.mood.slice(1);
                let moodEmoji = '';
                if (item.mood === 'baik') moodEmoji = '😊';
                else if (item.mood === 'sedang') moodEmoji = '😐';
                else if (item.mood === 'buruk') moodEmoji = '😟';

                itemDiv.innerHTML = `
                <p class="fw-semibold mb-1" style="color: var(--dark-text);">
                    Tanggal: <span class="fw-normal">${new Date(item.date).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                    })}</span>
                </p>
                <p class="fw-semibold mb-1" style="color: var(--dark-text);">
                    Mood: <span class="fw-normal">${moodText} ${moodEmoji}</span>
                </p>
                <p class="fw-semibold mb-0" style="color: var(--dark-text);">
                    Deskripsi: <span class="fw-normal">${item.description || '-'}</span>
                </p>
                `;

                if (historyList) historyList.appendChild(itemDiv);
            });
            } else {
            if (historyList)
                historyList.innerHTML =
                '<p style="color: var(--dark-text);">Belum ada riwayat check-in.</p>';
            }
        } catch (error) {
            if (historyList)
            historyList.innerHTML =
                '<p class="text-danger">Gagal memuat riwayat check-in.</p>';
        }
    }

    window.addEventListener('DOMContentLoaded', () => {
        currentUserToken = sessionStorage.getItem('authToken');
        currentUsername = sessionStorage.getItem('username');
        currentUserId = sessionStorage.getItem('userId');
        currentUserPhone = sessionStorage.getItem('userPhone'); // Ambil data telepon dari session
        updateUIForAuthState();
    });
});