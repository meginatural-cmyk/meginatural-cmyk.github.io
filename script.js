// Kayıt Olma Fonksiyonu
async function kayitOl() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await createUserWithEmailAndPassword(window.auth, email, pass);
        alert("Nefetc dünyasına hoş geldin!");
    } catch (error) {
        alert("Hata: " + error.message);
    }
}

// Giriş Yapma Fonksiyonu
async function girisYap() {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-pass').value;
    try {
        await signInWithEmailAndPassword(window.auth, email, pass);
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
    } catch (error) {
        alert("Giriş başarısız.");
    }
}

// Veritabanına Gönderi Ekleme (Yazı + Link + Resim)
async function paylas() {
    const desc = document.getElementById('img-desc').value;
    const url = document.getElementById('img-url').value;
    const link = document.getElementById('extra-link').value; // Yeni eklediğimiz link alanı

    try {
        await addDoc(collection(window.db, "posts"), {
            user: window.auth.currentUser.email,
            image: url,
            caption: desc,
            externalLink: link,
            createdAt: new Date()
        });
        alert("Paylaşıldı!");
        modal.style.display = 'none';
    } catch (e) {
        console.error("Hata: ", e);
    }
}

// Verileri Gerçek Zamanlı Çekme
function akisiGetir() {
    const q = query(collection(window.db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        feed.innerHTML = "";
        snapshot.forEach((doc) => {
            const post = doc.data();
            feed.innerHTML += `
                <div class="post-card">
                    <div class="post-header"><b>${post.user}</b></div>
                    <div class="post-img"><img src="${post.image}"></div>
                    <div class="post-footer">
                        <p>${post.caption}</p>
                        ${post.externalLink ? `<a href="${post.externalLink}" target="_blank" class="post-link">🔗 Bağlantıya Git</a>` : ''}
                    </div>
                </div>
            `;
        });
    });
}
