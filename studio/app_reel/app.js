var tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.disableVerticalSwipes();

var currentUser = null;
var starPrice = 240;
var giftStarPrice = 240;
var starsMode = 'buy';
var selectedPremiumMonths = 0;
var selectedGiftId = null;
var selectedGiftStars = 0;
var activeTab = 0;
var giftsLoaded = false;
var nftsLoaded = false;
var selectedNftId = null;
var selectedNftPrice = 0;
var selectedNftUrl = null;
var selectedNftName = null;
var selectedNftType = null;
var selectedGameId = null;
var selectedGameName = null;
var selectedGamePrice = 0;
var selectedGameType = '';
var tgPremPrice = 45000;
var tgPremAdmin = 'zzqqaz';
var userPremiumBall = 0;

var APP_VERSION = '4.1.5';
var _historyRenderCount = 8;

var _pollTimers = {};
var _pollIntervals = { gifts: 1000, nfts: 1000, top: 5000, history: 1000, game: 1000 };
var _sectionEmpty = { gifts: true, nfts: true, top: true, history: true, game: true };
var _sectionVisible = { gifts: false, nfts: false, top: false, history: false, game: false };
var _currentTopPeriod = 'daily';

function applyTheme() {
    var tp = tg.themeParams || {};
    var isDark = (tg.colorScheme === 'dark') || (!tp.bg_color && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (!tp.bg_color && tg.colorScheme === 'light') isDark = false;
    var root = document.documentElement;
    var bg = tp.bg_color || (isDark ? '#111827' : '#ffffff');
    var secBg = tp.secondary_bg_color || (isDark ? '#1c2535' : '#f4f4f5');
    var text = tp.text_color || (isDark ? '#ffffff' : '#000000');
    var hint = tp.hint_color || (isDark ? '#9ca3af' : '#707579');
    var link = tp.link_color || (isDark ? '#8AAC62' : '#2481cc');
    var btn = tp.button_color || (isDark ? '#8AAC62' : '#2481cc');
    var btnText = tp.button_text_color || '#ffffff';
    var dest = tp.destructive_text_color || '#ef4444';
    var secBgCol = tp.section_bg_color || (isDark ? '#1c2535' : '#ffffff');

    function set(name, val) { if (val) root.style.setProperty(name, val); }
    set('--tg-bg', bg);
    set('--tg-theme-bg-color', bg);
    set('--tg-secondary-bg', secBg);
    set('--tg-theme-secondary-bg-color', secBg);
    set('--tg-text', text);
    set('--tg-theme-text-color', text);
    set('--tg-hint', hint);
    set('--tg-theme-hint-color', hint);
    set('--tg-link', link);
    set('--tg-theme-link-color', link);
    set('--tg-btn', btn);
    set('--tg-theme-button-color', btn);
    set('--tg-btn-text', btnText);
    set('--tg-theme-button-text-color', btnText);
    set('--tg-accent', tp.accent_text_color || btn);
    set('--tg-section-bg', secBgCol);
    set('--tg-theme-section-bg-color', secBgCol);
    set('--tg-section-header', tp.section_header_text_color || hint);
    set('--tg-subtitle', tp.subtitle_text_color || hint);
    set('--tg-destructive', dest);
    set('--tg-theme-destructive-text-color', dest);
    set('--tg-header-bg', tp.header_bg_color || bg);

    if (tg.setHeaderColor) {
        try { tg.setHeaderColor(tp.header_bg_color || bg); } catch(e) {}
    }
    if (tg.setBackgroundColor) {
        try { tg.setBackgroundColor(bg); } catch(e) {}
    }
}
applyTheme();
if (typeof tg.onEvent === 'function') {
    tg.onEvent('themeChanged', applyTheme);
}

function clearOldCache() {
    var savedVersion = sessionStorage.getItem('app_version');
    if (savedVersion !== APP_VERSION) {
        sessionStorage.clear();
        sessionStorage.setItem('app_version', APP_VERSION);
    }
}

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function escapeHTML(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>'"]/g, function(tag) {
        var chars = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return chars[tag] || tag;
    });
}

function truncateName(name, maxLength) {
    maxLength = maxLength || 13;
    if (!name) return 'User';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
}

var _cryptoKey = null;

function _getSystemConfigToken() {
    var parts = [
        String.fromCharCode(83, 116, 97, 114, 115, 70, 117, 101, 108),
        String.fromCharCode(95, 83, 101, 99, 114, 101, 116, 75, 101, 121),
        String.fromCharCode(95, 65, 69, 83, 50, 53, 54),
        String.fromCharCode(95, 118, 52, 46, 49, 33)
    ];
    return parts.join('');
}

function _getCryptoKey() {
    if (_cryptoKey) return Promise.resolve(_cryptoKey);
    var raw = new TextEncoder().encode(_getSystemConfigToken()).slice(0, 32);
    var padded = new Uint8Array(32);
    padded.set(raw);
    return crypto.subtle.importKey('raw', padded, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
        .then(function(k) { _cryptoKey = k; return k; });
}

function _toBase64(buf) {
    var bytes = new Uint8Array(buf);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

function _fromBase64(str) {
    var bin = atob(str);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

function _encrypt(text) {
    return _getCryptoKey().then(function(key) {
        var iv = crypto.getRandomValues(new Uint8Array(12));
        var encoded = new TextEncoder().encode(text);
        return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encoded)
            .then(function(ct) {
                var combined = new Uint8Array(12 + ct.byteLength);
                combined.set(iv, 0);
                combined.set(new Uint8Array(ct), 12);
                return _toBase64(combined.buffer);
            });
    });
}

function _decrypt(b64) {
    return _getCryptoKey().then(function(key) {
        var combined = _fromBase64(b64);
        var iv = combined.slice(0, 12);
        var ct = combined.slice(12);
        return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct)
            .then(function(pt) { return new TextDecoder().decode(pt); });
    });
}

function apiCall(action, data, callback) {
    var payload = { action: action, initData: tg.initData };
    if (data) { for (var k in data) payload[k] = data[k]; }
    var plaintext = JSON.stringify(payload);
    _encrypt(plaintext).then(function(encrypted) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', 'api.php', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('X-Enc', '1');
        xhr.setRequestHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.setRequestHeader('Expires', '0');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var raw = xhr.responseText;
                try {
                    var parsed = JSON.parse(raw);
                    if (parsed && parsed.enc) {
                        _decrypt(parsed.enc).then(function(decrypted) {
                            try {
                                var obj = JSON.parse(decrypted);
                                if (obj && (obj.blocked === true || obj.error === 'user_blocked')) {
                                    showBlockedScreen();
                                    return;
                                }
                                callback(obj);
                            }
                            catch(e) { callback({ success: false, error: 'Parse xatosi' }); }
                        }).catch(function() { callback({ success: false, error: 'Decrypt xatosi' }); });
                    } else {
                        if (parsed && (parsed.blocked === true || parsed.error === 'user_blocked')) {
                            showBlockedScreen();
                            return;
                        }
                        callback(parsed);
                    }
                } catch(e) { callback({ success: false, error: 'Server xatosi' }); }
            }
        };
        xhr.send(JSON.stringify({ enc: encrypted }));
    }).catch(function() {
        callback({ success: false, error: 'Encrypt xatosi' });
    });
}

function showLoadingModal(text) {
    document.getElementById('loadingText').textContent = text;
    document.getElementById('loadingModal').classList.add('show');
}

function hideLoadingModal() {
    document.getElementById('loadingModal').classList.remove('show');
}

function showPaymentModal(payUrl, text) {
    hideLoadingModal();
    document.getElementById('paymentText').textContent = text;
    document.getElementById('paymentModal').classList.add('show');
    setTimeout(function () {
        tg.openLink(payUrl);
        setTimeout(function () {
            document.getElementById('paymentModal').classList.remove('show');
        }, 300);
    }, 1100);
}

function _startPoll(key, fn) {
    _stopPoll(key);
    _pollTimers[key] = setInterval(function () {
        if (_sectionVisible[key] && _sectionEmpty[key]) fn();
    }, _pollIntervals[key]);
}

function _stopPoll(key) {
    if (_pollTimers[key]) {
        clearInterval(_pollTimers[key]);
        _pollTimers[key] = null;
    }
}

function _setAllSectionsHidden() {
    for (var k in _sectionVisible) _sectionVisible[k] = false;
}

function skeletonGift() {
    var h = '<div class="gift-grid">';
    for (var i = 0; i < 8; i++) h += '<div class="skeleton-gift"><div class="sk-img"></div><div class="sk-line short"></div><div class="sk-line shorter"></div></div>';
    return h + '</div>';
}

function skeletonNft() {
    var h = '<div class="nft-grid">';
    for (var i = 0; i < 6; i++) h += '<div class="skeleton-nft"><div class="sk-img-nft"></div><div class="sk-line short"></div><div class="sk-line shorter"></div></div>';
    return h + '</div>';
}

function skeletonTop() {
    var h = '<div class="top-list">';
    for (var i = 0; i < 15; i++) h += '<div class="skeleton-top"><div class="sk-rank"></div><div class="sk-user"></div><div class="sk-amount"></div></div>';
    return h + '</div>';
}

function skeletonHistory() {
    var h = '';
    for (var i = 0; i < 4; i++) h += '<div class="skeleton-history"><div class="sk-hist-header"><div class="sk-hist-type"></div><div class="sk-hist-status"></div></div><div class="sk-line long"></div><div class="sk-line medium"></div><div class="sk-line short"></div></div>';
    return h;
}

var caseGiftsData = {
    15: [
        { id: '5170145012310081615', stars: 15, pct: '70%' },
        { id: '5170233102089322756', stars: 15, pct: '70%' }
    ],
    25: [
        { id: '5170250947678437525', stars: 25, pct: '25%' },
        { id: '5168103777563050263', stars: 25, pct: '25%' }
    ],
    50: [
        { id: '517014410496491616', stars: 50, pct: '15%' },
        { id: '5170314324215857265', stars: 50, pct: '15%' },
        { id: '5170564780938756245', stars: 50, pct: '15%' },
        { id: '6028601630662853006', stars: 50, pct: '15%' },
        { id: '592258454332916696', stars: 50, pct: '15%' },
        { id: '5956217000635139069', stars: 50, pct: '15%' },
        { id: '580110895304779062', stars: 50, pct: '15%' },
        { id: '58006555655995968830', stars: 50, pct: '15%' }
    ],
    100: [
        { id: '5168043875654172773', stars: 100, pct: '5%' },
        { id: '5170690322832818290', stars: 100, pct: '5%' },
        { id: '5170521118301225164', stars: 100, pct: '5%' }
    ]
};

var rouletteState = {
    animId: null,
    left: -2000,
    speed: 0.5,
    isSpinning: false,
    items: []
};

function getFallbackIcon(id) {
    return 'tgs/GIFTS/5170250947678437525.webp';
}

function setGiftMode(mode) {
    var normalWrap = document.getElementById('giftNormalWrap');
    var keysWrap = document.getElementById('giftKeysWrap');
    var keysBtn = document.getElementById('giftKeysBtn');
    var listBtn = document.getElementById('giftListBtn');
    
    if (mode === 'keys') {
        normalWrap.style.display = 'none';
        keysWrap.style.display = 'block';
        keysBtn.style.display = 'none';
        listBtn.style.display = 'block';
        initCaseRoulette();
    } else {
        normalWrap.style.display = 'block';
        keysWrap.style.display = 'none';
        keysBtn.style.display = 'block';
        listBtn.style.display = 'none';
        if (rouletteState.animId) {
            cancelAnimationFrame(rouletteState.animId);
            rouletteState.animId = null;
        }
    }
}

function initCaseRoulette() {
    var track = document.getElementById('caseRouletteTrack');
    if (!track) return;
    
    var priceLabel = document.getElementById('caseOpeningPriceLabel');
    if (priceLabel) {
        priceLabel.textContent = "Bir marta keys ochish: " + formatNumber(20 * giftStarPrice) + " so'm";
    }
    
    track.style.transition = 'none';
    rouletteState.left = -2000;
    rouletteState.speed = 0.5;
    rouletteState.isSpinning = false;
    rouletteState.items = [];
    
    var cheapItems = caseGiftsData[15];
    var expensiveItems = []
        .concat(caseGiftsData[25])
        .concat(caseGiftsData[50])
        .concat(caseGiftsData[100]);
        
    for (var i = 0; i < 150; i++) {
        if (i % 2 === 0) {
            var cheapGift = cheapItems[Math.floor(i / 2) % cheapItems.length];
            rouletteState.items.push(cheapGift);
        } else {
            var expGift = expensiveItems[Math.floor((i - 1) / 2) % expensiveItems.length];
            rouletteState.items.push(expGift);
        }
    }
    
    track.innerHTML = '';
    for (var j = 0; j < rouletteState.items.length; j++) {
        var item = rouletteState.items[j];
        var imgUrl = 'tgs/GIFTS/' + item.id + '.webp';
        
        var div = document.createElement('div');
        div.className = 'case-item';
        div.innerHTML = '<img src="' + imgUrl + '" onerror="this.onerror=null; this.src=\'' + getFallbackIcon(item.id) + '\'">'
            + '<div class="case-item-stars">' + item.stars + ' ⭐</div>'
            + '<div class="case-item-pct">' + item.pct + '</div>';
        track.appendChild(div);
    }
    
    runRouletteLoop();
}

function runRouletteLoop() {
    if (rouletteState.animId) cancelAnimationFrame(rouletteState.animId);
    
    var track = document.getElementById('caseRouletteTrack');
    var container = document.querySelector('.case-roulette-container');
    
    function update() {
        if (!track || !container) return;
        
        rouletteState.left += rouletteState.speed;
        
        var itemW = 88;
        var maxLeft = -itemW * 5;
        if (rouletteState.left > maxLeft) {
            rouletteState.left -= itemW * 60;
        }
        var minLeft = -itemW * 130;
        if (rouletteState.left < minLeft) {
            rouletteState.left += itemW * 60;
        }
        
        track.style.transform = 'translateX(' + rouletteState.left + 'px)';
        rouletteState.animId = requestAnimationFrame(update);
    }
    
    rouletteState.animId = requestAnimationFrame(update);
}

function openCase() {
    if (rouletteState.isSpinning) return;
    
    var btn = document.getElementById('openCaseBtn');
    var price = 20 * giftStarPrice;
    if (currentUser && currentUser.balance < price) {
        tg.showAlert("Balansingiz yetarli emas! Keys ochish narxi: " + formatNumber(price) + " so'm");
        return;
    }
    
    if (btn) btn.disabled = true;
    showLoadingModal("Tekshirilmoqda...");
    
    apiCall('open_case', { buyer_id: currentUser.id }, function(result) {
        hideLoadingModal();
        if (!result || !result.success) {
            if (btn) btn.disabled = false;
            tg.showAlert(result ? (result.error || "Ulanish xatosi!") : "Ulanish xatosi!");
            return;
        }
        
        rouletteState.isSpinning = true;
        rouletteState.speed = 35;
        
        var track = document.getElementById('caseRouletteTrack');
        var container = document.querySelector('.case-roulette-container');
        
        setTimeout(function() {
            var currentIdx = Math.floor(Math.abs(rouletteState.left) / 88);
            var targetIdx = currentIdx + 45;
            
            var wonItemData = {
                stars: result.gift_stars,
                id: result.gift_id,
                pct: result.gift_stars === 25 ? '25%' : '70%'
            };
            rouletteState.items[targetIdx] = wonItemData;
            
            track.innerHTML = '';
            for (var j = 0; j < rouletteState.items.length; j++) {
                var item = rouletteState.items[j];
                var gift = (j === targetIdx) ? { id: result.gift_id, stars: result.gift_stars, pct: result.gift_stars === 25 ? '25%' : '70%' } : item;
                var imgUrl = 'tgs/GIFTS/' + gift.id + '.webp';
                
                var div = document.createElement('div');
                div.className = 'case-item';
                div.innerHTML = '<img src="' + imgUrl + '" onerror="this.onerror=null; this.src=\'' + getFallbackIcon(gift.id) + '\'">'
                    + '<div class="case-item-stars">' + gift.stars + ' ⭐</div>'
                    + '<div class="case-item-pct">' + gift.pct + '</div>';
                track.appendChild(div);
            }
            
            if (rouletteState.animId) cancelAnimationFrame(rouletteState.animId);
            rouletteState.animId = null;
            
            var targetLeft = (container.offsetWidth / 2) - (targetIdx * 88) - 44;
            
            track.style.transition = 'transform 5s cubic-bezier(0.15, 0.85, 0.35, 1)';
            track.style.transform = 'translateX(' + targetLeft + 'px)';
            rouletteState.left = targetLeft;
            
            setTimeout(function() {
                rouletteState.isSpinning = false;
                if (btn) btn.disabled = false;
                
                if (result.refunded) {
                    if (result.reason === 'limit_low') {
                        tg.showAlert("Tabriklaymiz! Siz keysdan " + result.gift_stars + " Stars qiymatiga ega gift yutdingiz!\n\nHozirda zaxirada yetarli Stars mavjud emasligi sababli gift yuborilmadi va uning qiymati (" + formatNumber(result.refund_amount) + " so'm) balansingizga pul shaklida qaytarildi! 💰");
                    } else {
                        tg.showAlert("Tabriklaymiz! Siz keysdan " + result.gift_stars + " Stars qiymatiga ega gift yutdingiz!\n\nLekin sizda Telegram username o'rnatilmaganligi sababli, gift yuborilmadi va uning to'liq qiymati (" + formatNumber(result.refund_amount) + " so'm) balansingizga pul shaklida qaytarildi!");
                    }
                } else {
                    tg.showAlert("Tabriklaymiz! Siz keysdan " + result.gift_stars + " Stars qiymatidagi giftni yutdingiz! Gift profilingizga muvaffaqiyatli yuborildi. ✅");
                }
                
                loadStats();
                
                track.style.transition = 'none';
                rouletteState.speed = 0.5;
                runRouletteLoop();
            }, 5100);
        }, 1500);
    });
}

function loadGiftData() {
    var grid = document.getElementById('giftGrid');
    var wrap = document.getElementById('giftBuyWrap');
    grid.innerHTML = skeletonGift();
    wrap.style.display = 'none';
    selectedGiftId = null;
    selectedGiftStars = 0;
    document.getElementById('giftUsername').value = '';
    var msgInput = document.getElementById('giftMessage');
    if (msgInput) {
        msgInput.value = '';
        document.getElementById('giftMessageCharCount').textContent = '0 / 100';
        document.getElementById('giftPriceHint').style.display = 'none';
    }
    var anonCheckbox = document.getElementById('giftAnonymous');
    if (anonCheckbox) {
        anonCheckbox.checked = false;
    }
    apiCall('get_gifts', {}, function (result) {
        grid.innerHTML = '';
        if (!result || !result.success || !result.gifts || result.gifts.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-gift"></i><p>Giftlar mavjud emas</p></div>';
            _sectionEmpty.gifts = true;
            if (_sectionVisible.gifts) _startPoll('gifts', loadGiftData);
            return;
        }
        _sectionEmpty.gifts = false;
        _stopPoll('gifts');
        giftsLoaded = true;
        var gifts = result.gifts;
        allGifts = gifts;
        var container = document.createElement('div');
        container.className = 'gift-grid';
        for (var i = 0; i < gifts.length; i++) {
            (function (gift) {
                var price = gift.star_count * giftStarPrice;
                var card = document.createElement('div');
                card.className = 'gift-card';
                card.setAttribute('data-id', gift.id);
                var img = document.createElement('img');
                img.src = 'tgs/GIFTS/' + gift.id + '.webp';
                img.className = 'gift-img';
                img.alt = '';
                img.onerror = function () { this.style.display = 'none'; };
                var stars = document.createElement('div');
                stars.className = 'gift-stars';
                stars.innerHTML = '<i class="fas fa-star"></i> ' + gift.star_count;
                var priceEl = document.createElement('div');
                priceEl.className = 'gift-price';
                priceEl.textContent = formatNumber(price) + ' so\'m';
                card.appendChild(img);
                card.appendChild(stars);
                card.appendChild(priceEl);
                card.onclick = function () {
                    var all = container.querySelectorAll('.gift-card');
                    for (var j = 0; j < all.length; j++) all[j].classList.remove('gift-card-selected');
                    card.classList.add('gift-card-selected');
                    selectedGiftId = gift.id;
                    selectedGiftStars = gift.star_count;
                    wrap.style.display = 'block';
                };
                container.appendChild(card);
            })(gifts[i]);
        }
        grid.appendChild(container);
    });
}

function onGiftMessageInput() {
    var msgInput = document.getElementById('giftMessage');
    var charCount = document.getElementById('giftMessageCharCount');
    var priceHint = document.getElementById('giftPriceHint');
    if (msgInput && charCount && priceHint) {
        var len = msgInput.value.length;
        charCount.textContent = len + ' / 100';
        if (len > 0) {
            priceHint.style.display = 'block';
        } else {
            priceHint.style.display = 'none';
        }
    }
}

function createGiftOrder() {
    if (!selectedGiftId) { tg.showAlert(t('err_gift')); return; }
    var username = document.getElementById('giftUsername').value.trim();
    if (!username || username.length < 2) { tg.showAlert(t('err_username')); return; }
    var giftMessage = document.getElementById('giftMessage').value.trim();
    var hide = document.getElementById('giftAnonymous').checked ? 'true' : 'false';
    showLoadingModal(t('order_creating'));
    apiCall('create_gift_order', {
        buyer_id: currentUser.id,
        gift_id: selectedGiftId,
        gift_stars: selectedGiftStars,
        target_username: username,
        gift_message: giftMessage,
        hide: hide,
        payment_method: paymentMethods.gift
    }, function (result) {
        hideLoadingModal();
        if (result && result.success) {
            if (result.paid_via_balance) {
                tg.showAlert("Gift buyurtmasi muvaffaqiyatli bajarildi!");
                loadStats();
            } else {
                showPaymentModal(result.pay_url, 'Gift (' + selectedGiftStars + ' Stars) - ' + formatNumber(result.price) + ' ' + t('currency') + '\n\n' + t('pay_redirect'));
            }
        } else {
            tg.showAlert(result.error || t('err_generic'));
        }
    });
}

function loadNftData() {
    var grid = document.getElementById('nftGrid');
    grid.innerHTML = skeletonNft();
    selectedNftId = null;
    selectedNftUrl = null;
    selectedNftName = null;
    selectedNftType = null;
    apiCall('get_nfts', {}, function (result) {
        grid.innerHTML = '';
        if (!result || !result.success || !result.nfts || result.nfts.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-layer-group"></i><p>NFT mavjud emas</p></div>';
            _sectionEmpty.nfts = true;
            if (_sectionVisible.nfts) _startPoll('nfts', loadNftData);
            return;
        }
        _sectionEmpty.nfts = false;
        _stopPoll('nfts');
        nftsLoaded = true;
        var container = document.createElement('div');
        container.className = 'nft-grid';
        for (var i = 0; i < result.nfts.length; i++) {
            (function (nft) {
                var parts = nft.id.split('/');
                var nftSlug = parts[parts.length - 1];
                var imgUrl = 'https://nft.fragment.com/gift/' + nftSlug + '.medium.jpg';
                var card = document.createElement('div');
                card.className = 'nft-card';
                card.setAttribute('data-id', nft.id);
                if (nft.type === 'gram') {
                    var badge = document.createElement('div');
                    badge.className = 'nft-badge-wallet';
                    badge.innerHTML = '<i class="fas fa-wallet"></i> ' + t('nft_in_wallet');
                    card.appendChild(badge);
                }
                var img = document.createElement('img');
                img.src = imgUrl;
                img.className = 'nft-img';
                img.alt = '';
                img.onerror = function () { this.style.display = 'none'; };
                var nameEl = document.createElement('div');
                nameEl.className = 'nft-card-name';
                nameEl.textContent = nftSlug;
                var priceEl = document.createElement('div');
                priceEl.className = 'nft-card-price';
                priceEl.textContent = formatNumber(nft.price) + ' so\'m';
                card.appendChild(img);
                card.appendChild(nameEl);
                card.appendChild(priceEl);
                card.onclick = function () {
                    var all = container.querySelectorAll('.nft-card');
                    for (var j = 0; j < all.length; j++) all[j].classList.remove('nft-card-selected');
                    card.classList.add('nft-card-selected');
                    selectedNftId = nft.id;
                    selectedNftPrice = nft.price;
                    selectedNftUrl = 'https://' + nft.id;
                    selectedNftName = nftSlug;
                    selectedNftType = nft.type || 'telegram';
                    openNftModal(imgUrl, nftSlug, nft.price, selectedNftUrl, selectedNftType);
                };
                container.appendChild(card);
            })(result.nfts[i]);
        }
        grid.appendChild(container);
    });
}

function openNftModal(imgUrl, name, price, url, type) {
    document.getElementById('nftDetailImg').src = imgUrl;
    document.getElementById('nftDetailName').textContent = name;
    document.getElementById('nftDetailPrice').textContent = formatNumber(price) + ' so\'m';
    document.getElementById('nftDetailLink').href = url;
    document.getElementById('nftDetailLink').onclick = function (e) {
        e.preventDefault();
        tg.openLink(url);
    };
    var labelEl = document.getElementById('nftInputLabel');
    var inputEl = document.getElementById('nftUsername');
    var selfBtn = document.getElementById('nftSelfUserBtn');
    var warnEl = document.getElementById('nftWalletWarning');
    if (type === 'gram') {
        if (labelEl) labelEl.innerHTML = '<i class="fas fa-wallet"></i> ' + t('nft_wallet_label');
        if (inputEl) inputEl.placeholder = t('nft_wallet_ph') || 'UQ...';
        if (selfBtn) selfBtn.style.display = 'none';
        if (warnEl) warnEl.style.display = 'block';
    } else {
        if (labelEl) labelEl.innerHTML = '<i class="fas fa-user"></i> ' + t('user_label');
        if (inputEl) inputEl.placeholder = '@username';
        if (selfBtn) selfBtn.style.display = 'flex';
        if (warnEl) warnEl.style.display = 'none';
    }
    if (inputEl) inputEl.value = '';
    document.getElementById('nftModal').style.display = 'flex';
}

function closeNftModal() {
    document.getElementById('nftModal').style.display = 'none';
}

function createNftOrder() {
    if (!selectedNftId) { tg.showAlert(t('err_nft')); return; }
    var username = document.getElementById('nftUsername').value.trim();
    if (selectedNftType === 'gram') {
        if (!username || username.length < 10) {
            tg.showAlert(t('err_nft_wallet'));
            return;
        }
        if (!username.toUpperCase().startsWith('UQ') && !username.toUpperCase().startsWith('EQ')) {
            tg.showAlert(t('err_nft_wallet'));
            return;
        }
    } else {
        if (!username || username.length < 2) {
            tg.showAlert(t('err_username'));
            return;
        }
    }
    closeNftModal();
    showLoadingModal(t('order_creating'));
    apiCall('create_nft_order', {
        buyer_id: currentUser.id,
        nft_id: selectedNftId,
        nft_name: selectedNftName,
        nft_price: selectedNftPrice,
        nft_type: selectedNftType,
        target_username: username,
        payment_method: paymentMethods.nft
    }, function (result) {
        hideLoadingModal();
        if (result && result.success) {
            if (result.paid_via_balance) {
                tg.showAlert("NFT buyurtmasi muvaffaqiyatli bajarildi!");
                loadStats();
            } else {
                showPaymentModal(result.pay_url, 'NFT: ' + selectedNftName + '\n' + formatNumber(result.price) + ' ' + t('currency') + '\n\n' + t('pay_redirect'));
            }
        } else {
            tg.showAlert(result.error || t('err_generic'));
        }
    });
}

function initFullscreen() {
    if (tg.requestFullscreen) {
        try {
            tg.requestFullscreen();
            tg.onEvent('fullscreenChanged', function () {
                var inset = tg.safeAreaInset && tg.safeAreaInset.top ? tg.safeAreaInset.top : 70;
                document.querySelector('.top-nav').style.paddingTop = inset + 'px';
            });
            var inset = tg.safeAreaInset && tg.safeAreaInset.top ? tg.safeAreaInset.top : 70;
            document.querySelector('.top-nav').style.paddingTop = inset + 'px';
        } catch (e) {
            document.querySelector('.top-nav').style.paddingTop = '70px';
        }
    } else {
        document.querySelector('.top-nav').style.paddingTop = '0px';
    }
}

function init() {
    clearOldCache();
    detectLang();
    applyTheme();
    applyLang();
    tg.onEvent('themeChanged', applyTheme);
    initFullscreen();
    setTimeout(function () {
        document.getElementById('loadingScreen').classList.add('hide');
        document.getElementById('appContainer').classList.add('show');
    }, 3000);
    var user = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (!user) {
        setTimeout(function () { tg.showAlert(t('err_no_user')); }, 2500);
        return;
    }
    currentUser = {
        id: user.id,
        first_name: user.first_name || 'User',
        username: user.username || '',
        photo_url: user.photo_url || ''
    };
    apiCall('get_price', {}, function (r) {
        if (r && r.success) {
            starPrice = r.star_price;
            giftStarPrice = r.gift_star_price || r.star_price;
            var gameEnabled = r.game_enabled !== false;
            var gameNavItem = document.getElementById('gameNavItem');
            var gameTab = document.getElementById('gameTab');
            if (gameNavItem) gameNavItem.style.display = gameEnabled ? '' : 'none';
            if (gameTab) gameTab.style.display = gameEnabled ? '' : 'none';
            var puckEnabled = r.fuelpuck_enabled !== false;
            window._fuelpuck_enabled = puckEnabled;
            var promoBanner = document.querySelector('.fuelpuck-promo-banner');
            if (promoBanner) promoBanner.style.display = puckEnabled ? '' : 'none';
            var puckCard = document.querySelector('.fuelpuck-card-icon');
            if (puckCard) {
                var cardEl = puckCard.closest('.service-card');
                if (cardEl) cardEl.style.display = puckEnabled ? '' : 'none';
            }
            if (r.system_status === 'off') {
                showBotOffScreen();
                return;
            }
        }
    });
    document.getElementById('userName').textContent = currentUser.first_name;
    document.getElementById('userId').textContent = currentUser.id;
    document.getElementById('userInitial').textContent = currentUser.first_name.charAt(0).toUpperCase();
    if (currentUser.photo_url) {
        document.getElementById('userAvatar').innerHTML = '<img src="' + currentUser.photo_url + '" alt="">';
    }
    var starsUsernameInput = document.getElementById('starsUsername');
    if (starsUsernameInput) {
        starsUsernameInput.addEventListener('input', updateTelegramPostPreview);
    }
    var starsAmountInput = document.getElementById('starsAmount');
    if (starsAmountInput) {
        starsAmountInput.addEventListener('input', updateStarsCalculatedPrice);
    }
    updateNavBackground();
    loadStats();
    updateStarsCalculatedPrice();
    var historyList = document.getElementById('historyList');
    if (historyList) {
        historyList.addEventListener('scroll', function() {
            var loader = document.getElementById('historyInfiniteLoader');
            if (loader) {
                var rect = loader.getBoundingClientRect();
                var listRect = historyList.getBoundingClientRect();
                if (rect.top <= listRect.bottom + 50) {
                    _historyRenderCount += 8;
                    renderHistory(true);
                }
            }
        });
    }
    var startParam = null;
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.start_param) {
        startParam = Telegram.WebApp.initDataUnsafe.start_param;
    }
    if (!startParam) {
        var urlP = new URLSearchParams(window.location.search);
        startParam = urlP.get('tgWebAppStartParam') || urlP.get('startapp') || urlP.get('startApp');
    }
    if (!startParam && window.location.hash) {
        var hashP = new URLSearchParams(window.location.hash.substring(1));
        startParam = hashP.get('tgWebAppStartParam') || hashP.get('startapp') || hashP.get('startApp');
    }
    if (startParam) {
        if (startParam.indexOf('give_') === 0 || startParam.indexOf('giveaway_') === 0 || startParam.indexOf('gw_') === 0) {
            var gwCode = startParam.replace(/^(give_|giveaway_)/, '');
            setTimeout(function () {
                switchTab(2);
                openGiveawaysView();
                openGiveawayModal(gwCode);
            }, 600);
        }
    }
}

function updateNavBackground() {
    var navItems = document.querySelectorAll('.nav-item');
    var targetIndex = activeTab === 5 ? 3 : activeTab;
    var activeItem = navItems[targetIndex];
    var background = document.getElementById('navBackground');
    if (activeItem && background) {
        var rect = activeItem.getBoundingClientRect();
        var containerRect = activeItem.parentElement.getBoundingClientRect();
        background.style.width = rect.width + 'px';
        background.style.height = rect.height + 'px';
        background.style.left = (rect.left - containerRect.left) + 'px';
        background.style.top = (rect.top - containerRect.top) + 'px';
    }
}

function selectPremium(months, element) {
    var cards = document.querySelectorAll('.premium-card');
    for (var i = 0; i < cards.length; i++) cards[i].classList.remove('selected');
    element.classList.add('selected');
    selectedPremiumMonths = months;
    
    var normalFields = document.getElementById('premiumNormalFields');
    var adminField = document.getElementById('premiumAdminField');
    if (months === 1) {
        if (normalFields) normalFields.style.display = 'none';
        if (adminField) adminField.style.display = 'block';
    } else {
        if (normalFields) normalFields.style.display = 'block';
        if (adminField) adminField.style.display = 'none';
    }
}

function useSelfUsername(type) {
    if (!currentUser || !currentUser.username) { tg.showAlert(t('err_no_username')); return; }
    var username = currentUser.username.indexOf('@') === 0 ? currentUser.username : '@' + currentUser.username;
    if (type === 'stars') document.getElementById('starsUsername').value = username;
    else if (type === 'premium') document.getElementById('premiumUsername').value = username;
    else if (type === 'nft') document.getElementById('nftUsername').value = username;
    else if (type === 'gift') document.getElementById('giftUsername').value = username;
}

function setStarsMode(mode) {
    var titleEl = document.getElementById('starsTitleText');
    var postgaBtn = document.getElementById('postgaBtn');
    var starsOlishBtn = document.getElementById('starsOlishBtn');
    var amountLabel = document.getElementById('starsAmountLabel');
    var amountInput = document.getElementById('starsAmount');
    var userLabel = document.getElementById('starsUserLabel');
    var userField = document.getElementById('starsUsername');
    var userIconBtn = document.getElementById('starsUserIconBtn');
    var warningCard = document.getElementById('starsWarningCard');
    if (mode === 'post') {
        titleEl.innerHTML = '<i class="fas fa-star"></i> Postga stars';
        postgaBtn.style.display = 'none';
        starsOlishBtn.style.display = 'block';
        amountLabel.innerHTML = '<i class="fas fa-hashtag"></i> Stars miqdori (10-100)';
        amountInput.min = 10;
        amountInput.max = 100;
        amountInput.value = '';
        userLabel.innerHTML = '<i class="fas fa-link"></i> Post havolasi';
        userField.placeholder = "https://t.me/kanala/3434";
        userField.value = '';
        userIconBtn.style.display = 'none';
        warningCard.style.display = 'block';
        starsMode = 'post';
    } else {
        titleEl.innerHTML = '<i class="fas fa-star"></i> Telegram Stars';
        postgaBtn.style.display = 'block';
        starsOlishBtn.style.display = 'none';
        amountLabel.innerHTML = '<i class="fas fa-hashtag"></i> Stars miqdori (50-2500)';
        amountInput.min = 50;
        amountInput.max = 2500;
        amountInput.value = '';
        userLabel.innerHTML = '<i class="fas fa-user"></i> Foydalanuvchi';
        userField.placeholder = "@username";
        userField.value = '';
        userIconBtn.style.display = 'flex';
        warningCard.style.display = 'none';
        starsMode = 'buy';
    }
    updateTelegramPostPreview();
    updateStarsCalculatedPrice();
}

function updateStarsCalculatedPrice() {
    var input = document.getElementById('starsAmount');
    var badge = document.getElementById('starsCalculatedPriceBadge');
    var span = document.getElementById('starsCalculatedPriceVal');
    if (!input || !badge || !span) return;
    var val = parseInt(input.value);
    var minLimit = (starsMode === 'post') ? 10 : 50;
    if (!val || isNaN(val) || val < minLimit) {
        span.textContent = '0';
        return;
    }
    var currentPricePerStar = (starsMode === 'post') ? giftStarPrice : starPrice;
    var total = val * currentPricePerStar;
    span.textContent = formatNumber(total);
}

function createStarsOrder() {
    var amount = parseInt(document.getElementById('starsAmount').value);
    var username = document.getElementById('starsUsername').value.trim();
    if (starsMode === 'post') {
        var normalizedUrl = username.replace(/^(https?:\/\/)?(www\.)?/, '');
        normalizedUrl = normalizedUrl.replace(/^telegram\.me/, 't.me');
        if (normalizedUrl.startsWith('t.me/')) {
            username = 'https://' + normalizedUrl;
        }
        if (!amount || amount < 10 || amount > 100) { tg.showAlert("Stars miqdori 10-100 oralig'ida bo'lishi kerak!"); return; }
        if (!username || username.length < 5 || !username.startsWith('http')) { tg.showAlert("Post havolasi noto'g'ri!"); return; }
        showLoadingModal(t('order_creating'));
        apiCall('create_post_stars_order', {
            buyer_id: currentUser.id,
            post_count: amount,
            post_url: username,
            payment_method: paymentMethods.stars
        }, function (result) {
            hideLoadingModal();
            if (result && result.success) {
                if (result.paid_via_balance) {
                    tg.showAlert("Postga stars buyurtmasi muvaffaqiyatli bajarildi!");
                    loadStats();
                } else {
                    showPaymentModal(result.pay_url, t('order_created') + '\n' + amount + ' Stars - ' + formatNumber(result.price) + ' ' + t('currency') + '\n\n' + t('pay_redirect'));
                }
            } else {
                tg.showAlert(result.error || t('err_generic'));
            }
        });
        return;
    }
    if (!amount || amount < 50 || amount > 2500) { tg.showAlert(t('err_amount')); return; }
    if (!username || username.length < 2) { tg.showAlert(t('err_username')); return; }
    showLoadingModal(t('order_creating'));
    apiCall('create_stars_order', {
        buyer_id: currentUser.id,
        quantity: amount,
        target_username: username,
        payment_method: paymentMethods.stars
    }, function (result) {
        hideLoadingModal();
        if (result && result.success) {
            if (result.paid_via_balance) {
                tg.showAlert("Stars buyurtmasi muvaffaqiyatli bajarildi!");
                loadStats();
            } else {
                showPaymentModal(result.pay_url, t('order_created') + '\n' + amount + ' Stars - ' + formatNumber(result.price) + ' ' + t('currency') + '\n\n' + t('pay_redirect'));
            }
        } else {
            tg.showAlert(result.error || t('err_generic'));
        }
    });
}

function createPremiumOrder() {
    var username = document.getElementById('premiumUsername').value.trim();
    if (!selectedPremiumMonths) { tg.showAlert(t('err_period')); return; }
    if (!username || username.length < 2) { tg.showAlert(t('err_username')); return; }
    showLoadingModal(t('order_creating'));
    apiCall('create_premium_order', {
        buyer_id: currentUser.id,
        months: selectedPremiumMonths,
        target_username: username,
        payment_method: paymentMethods.premium
    }, function (result) {
        hideLoadingModal();
        if (result && result.success) {
            if (result.paid_via_balance) {
                tg.showAlert("Premium buyurtmasi muvaffaqiyatli bajarildi!");
                loadStats();
            } else {
                showPaymentModal(result.pay_url, t('order_created') + '\n' + selectedPremiumMonths + ' ' + t('month') + ' Premium - ' + formatNumber(result.price) + ' ' + t('currency') + '\n\n' + t('pay_redirect'));
            }
        } else {
            tg.showAlert(result.error || t('err_generic'));
        }
    });
}

function updatePendingBadge(count) {
    var badge = document.getElementById('pendingBadge');
    var dot = document.getElementById('pendingDot');
    if (badge) {
        if (count && count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
    if (dot) {
        dot.style.display = (count && count > 0) ? 'inline-block' : 'none';
    }
}

function loadStats() {
    if (!currentUser) return;
    apiCall('get_stats', { user_id: currentUser.id }, function (result) {
        if (result && result.success) {
            document.getElementById('totalStars').textContent = block_nan(result.stars);
            document.getElementById('totalMoney').textContent = formatNumber(result.money || 0) + ' ' + t('currency');
            document.getElementById('totalOrders').textContent = block_nan(result.savdo_soni);
            var balanceText = formatNumber(result.balance || 0) + ' so\'m';
            document.getElementById('topBalanceValue').textContent = balanceText;
            document.getElementById('accountBalance').textContent = balanceText;
            document.getElementById('balanceTabValue').textContent = balanceText;
            
            if (result.tgprem_price) {
                tgPremPrice = result.tgprem_price;
                var priceText = formatNumber(tgPremPrice) + " so'm";
                var p1 = document.getElementById('premiumPrice1');
                if (p1) p1.innerHTML = priceText;
                var pText = document.getElementById('premiumAdminPriceText');
                if (pText) pText.textContent = priceText;
            }
            if (result.tgprem_admin) {
                tgPremAdmin = result.tgprem_admin;
            }
            
            if (result.premium_ball !== undefined) {
                updateUserBallDisplay(result.premium_ball);
            }
            
            if (result.birthdate) {
                checkAndStartBirthdayCelebration(result.birthdate);
            }
            
            updateWeeklyGoal(result.weekly_spent || 0);
            updatePendingBadge(result.pending_orders || 0);
        } else {
            updateWeeklyGoal(0);
        }
    });
}

function checkAndStartBirthdayCelebration(birthdate) {
    if (!birthdate || !birthdate.day || !birthdate.month) return;
    var today = new Date();
    var birthDay = parseInt(birthdate.day);
    var birthMonth = parseInt(birthdate.month);
    
    if (today.getDate() === birthDay && (today.getMonth() + 1) === birthMonth) {
        startBirthdayEffects();
    }
}

var _birthdayAnimationActive = false;
function startBirthdayEffects() {
    if (_birthdayAnimationActive) return;
    _birthdayAnimationActive = true;
    
    var canvas = document.getElementById('birthdayCanvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    
    var ctx = canvas.getContext('2d');
    var particles = [];
    var fireworks = [];
    var startTime = Date.now();
    var duration = 12000;
    
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();
    
    function Particle(x, y, color, speed, angle, gravity, friction, fade) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.angle = angle;
        this.speed = speed;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.gravity = gravity;
        this.friction = friction;
        this.fade = fade;
        this.alpha = 1;
        this.size = Math.random() * 3 + 1;
    }
    Particle.prototype.draw = function() {
        ctx.save();
        ctx.globalAlpha = this.alpha * 0.55;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };
    Particle.prototype.update = function() {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.fade;
    };
    
    function Firework() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height;
        this.targetY = Math.random() * (canvas.height * 0.5) + canvas.height * 0.1;
        this.speed = Math.random() * 4 + 7;
        this.color = 'hsl(' + Math.floor(Math.random() * 360) + ', 100%, 70%)';
        this.vy = -this.speed;
        this.vx = (Math.random() - 0.5) * 2;
    }
    Firework.prototype.update = function() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y <= this.targetY) {
            explodeFirework(this.x, this.y, this.color);
            return false;
        }
        return true;
    };
    Firework.prototype.draw = function() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };
    
    function explodeFirework(x, y, color) {
        var count = 30;
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2) * (i / count);
            var speed = Math.random() * 3 + 2;
            particles.push(new Particle(x, y, color, speed, angle, 0.04, 0.98, Math.random() * 0.015 + 0.01));
        }
    }
    
    var confettiColors = ['#ff79c6', '#bd93f9', '#8be9fd', '#50fa7b', '#f1fa8c', '#ffb86c', '#ff5555'];
    function addConfetti() {
        if (Math.random() > 0.06) return;
        var x = Math.random() * canvas.width;
        var y = -10;
        var color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
        var speed = Math.random() * 2 + 1;
        var angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.5;
        var p = new Particle(x, y, color, speed, angle, 0.02, 0.99, Math.random() * 0.003 + 0.002);
        p.size = Math.random() * 4 + 3;
        particles.push(p);
    }
    
    function loop() {
        if (Date.now() - startTime > duration) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
            _birthdayAnimationActive = false;
            window.removeEventListener('resize', resize);
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (Math.random() < 0.006) {
            fireworks.push(new Firework());
        }
        
        addConfetti();
        
        for (var i = fireworks.length - 1; i >= 0; i--) {
            var fw = fireworks[i];
            if (fw.update()) {
                fw.draw();
            } else {
                fireworks.splice(i, 1);
            }
        }
        
        for (var j = particles.length - 1; j >= 0; j--) {
            var p = particles[j];
            p.update();
            if (p.alpha <= 0) {
                particles.splice(j, 1);
            } else {
                p.draw();
            }
        }
        
        requestAnimationFrame(loop);
    }
    
    loop();
}

function block_nan(val) {
    var n = parseInt(val);
    return isNaN(n) ? 0 : n;
}

function contactAdminForPremium() {
    var text = "Salom men @StarsFuelbot orqali 1 oylik premium xarid qilmoqchiman. Iltimos karta tashlang.\n\n";
    if (currentUser) {
        text += "ID: " + currentUser.id;
        text += "\nIsm: " + (currentUser.first_name || '');
        if (currentUser.username) {
            text += "\nUsername: @" + currentUser.username;
        }
    }
    var url = "https://t.me/" + tgPremAdmin + "?text=" + encodeURIComponent(text);
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

var premiumMode = 'buy';
var ticketFilter = 'active';
var userTickets = [];

function setPremiumMode(mode) {
    var buyWrap = document.getElementById('premiumBuyWrap');
    var ticketsWrap = document.getElementById('premiumTicketsWrap');
    var chiptalarimBtn = document.getElementById('chiptalarimBtn');
    var sotibOlishBtn = document.getElementById('premiumSotibOlishBtn');
    var titleText = document.getElementById('premiumTitleText');
    
    if (mode === 'tickets') {
        if (buyWrap) buyWrap.style.display = 'none';
        if (ticketsWrap) ticketsWrap.style.display = 'block';
        if (chiptalarimBtn) chiptalarimBtn.style.display = 'none';
        if (sotibOlishBtn) sotibOlishBtn.style.display = 'block';
        if (titleText) titleText.textContent = "Chiptalarim";
        premiumMode = 'tickets';
        loadTickets();
    } else {
        if (buyWrap) buyWrap.style.display = 'block';
        if (ticketsWrap) ticketsWrap.style.display = 'none';
        if (chiptalarimBtn) chiptalarimBtn.style.display = 'block';
        if (sotibOlishBtn) sotibOlishBtn.style.display = 'none';
        if (titleText) titleText.textContent = "Telegram Premium";
        premiumMode = 'buy';
    }
}

function switchTicketFilter(filter) {
    ticketFilter = filter;
    var tabActive = document.getElementById('ticketTabActive');
    var tabArchive = document.getElementById('ticketTabArchive');
    if (filter === 'active') {
        if (tabActive) tabActive.classList.add('active');
        if (tabArchive) tabArchive.classList.remove('active');
    } else {
        if (tabActive) tabActive.classList.remove('active');
        if (tabArchive) tabArchive.classList.add('active');
    }
    renderTickets();
}

function loadTickets() {
    var grid = document.getElementById('ticketsGrid');
    if (grid) {
        var skHtml = '';
        for (var i = 0; i < 3; i++) {
            skHtml += '<div class="skeleton-ticket-card">'
                   + '  <div style="display:flex; justify-content:space-between; align-items:center;">'
                   + '    <div class="sk-line" style="width:75px; height:18px;"></div>'
                   + '    <div class="sk-line" style="width:45px; height:18px;"></div>'
                   + '  </div>'
                   + '  <div style="display:flex; justify-content:space-between; align-items:center; border-top: 1px dashed color-mix(in srgb, var(--tg-text) 8%, transparent); padding-top: 12px; margin-top: 4px;">'
                   + '    <div class="sk-line" style="width:110px; height:12px;"></div>'
                   + '    <div class="sk-line" style="width:75px; height:22px; border-radius:8px;"></div>'
                   + '  </div>'
                   + '</div>';
        }
        grid.innerHTML = '<div class="ticket-container">' + skHtml + '</div>';
    }
    
    apiCall('get_tickets', {}, function (r) {
        if (r && r.success) {
            userTickets = r.tickets || [];
            if (r.premium_ball !== undefined) {
                updateUserBallDisplay(r.premium_ball);
            }
            renderTickets();
        } else {
            if (grid) grid.innerHTML = '<div class="error-msg" style="text-align:center;color:red;font-size:12px;">Chiptalarni yuklashda xatolik yuz berdi.</div>';
        }
    });
}

function renderTickets() {
    var grid = document.getElementById('ticketsGrid');
    if (!grid) return;
    
    var filtered = userTickets.filter(function (t) {
        return (ticketFilter === 'active') ? (t.status === 'active') : (t.status !== 'active');
    });
    
    if (filtered.length === 0) {
        var icon = (ticketFilter === 'active') ? 'fa-ticket-alt' : 'fa-archive';
        var title = (ticketFilter === 'active') ? 'Sizda faol chiptalar yo\'q' : 'Arxiv bo\'sh';
        var desc = (ticketFilter === 'active') 
            ? "1 oylik Telegram Premium obunasini xarid qiling va yutuqli chiptaga ega bo'ling!"
            : "Sizda arxivlangan (foydalanilgan) chiptalar hozircha mavjud emas.";
            
        grid.innerHTML = '<div class="ticket-empty-state">'
                       + '  <div class="ticket-empty-icon"><i class="fas ' + icon + '"></i></div>'
                       + '  <div class="ticket-empty-title">' + title + '</div>'
                       + '  <div class="ticket-empty-desc">' + desc + '</div>'
                       + '</div>';
        return;
    }
    
    var html = '';
    filtered.forEach(function (t) {
        var date = new Date(t.created_at);
        var dateStr = date.toLocaleDateString('uz-UZ') + ' ' + date.toLocaleTimeString('uz-UZ', {hour: '2-digit', minute:'2-digit'});
        var statusBadge = (t.status === 'active') 
            ? '<span class="ticket-badge-active">Faol</span>'
            : '<span class="ticket-badge-archive">Arxiv</span>';
            
        html += '<div class="ticket-card">'
             + '  <div class="ticket-header">'
             + '    <span class="ticket-code-text">' + t.code + '</span>'
             + '    ' + statusBadge
             + '  </div>'
             + '  <div class="ticket-footer">'
             + '    <span class="ticket-date"><i class="far fa-calendar-alt" style="color:var(--tg-btn);"></i> ' + dateStr + '</span>'
             + '    <button class="ticket-copy-btn" onclick="copyText(\'' + t.code + '\', \'Chipta kodi nusxalandi: ' + t.code + '\')"><i class="far fa-copy"></i> Nusxalash</button>'
             + '  </div>'
             + '</div>';
    });
    grid.innerHTML = '<div class="ticket-container">' + html + '</div>';
}

function updateWeeklyGoal(spent) {
    var GOAL = 1200000;
    var fill = document.getElementById('wgProgressFill');
    var sub = document.getElementById('wgSubText');
    var card = document.querySelector('.weekly-goal-card');
    if (!fill || !sub) return;
    var pct = Math.min(100, Math.round((spent / GOAL) * 100));
    setTimeout(function () { fill.style.width = pct + '%'; }, 300);
    if (pct >= 100) {
        sub.innerHTML = '<i class="fas fa-check-circle"></i> <strong>' + t('goal_done') + '</strong>';
        if (card) card.classList.add('wg-done');
    } else {
        var left = GOAL - spent;
        sub.innerHTML = '<strong>' + formatNumber(left) + ' ' + t('currency') + '</strong> ' + t('goal_left') + ' &middot; ' + pct + '% ' + t('goal_done_pct');
    }
}

function loadTop(period) {
    period = period || 'daily';
    _currentTopPeriod = period;
    var list = document.getElementById('topList');
    list.innerHTML = skeletonTop();
    apiCall('get_top', { period: period, limit: 15 }, function (result) {
        list.innerHTML = '';
        if (result && result.success && result.users && result.users.length > 0) {
            _sectionEmpty.top = false;
            _stopPoll('top');
            var medals = [
                '<i class="fas fa-medal" style="color:#FFD700"></i>',
                '<i class="fas fa-medal" style="color:#C0C0C0"></i>',
                '<i class="fas fa-medal" style="color:#CD7F32"></i>'
            ];
            for (var i = 0; i < result.users.length; i++) {
                var u = result.users[i];
                var item = document.createElement('div');
                item.className = 'top-item';
                var rankIcon = i < 3 ? medals[i] : '<span style="font-weight:600;font-size:13px;">' + (i + 1) + '</span>';
                item.innerHTML = '<span class="top-rank">' + rankIcon + '</span><span class="top-user">' + escapeHTML(truncateName(u.first_name || 'User')) + '</span><span class="top-amount">' + formatNumber(u.total) + ' ' + t('currency') + '</span>';
                list.appendChild(item);
            }
        } else {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>' + t('top_empty') + '</p></div>';
            _sectionEmpty.top = true;
            if (_sectionVisible.top) _startPoll('top', function () { loadTop(_currentTopPeriod); });
        }
    });
}

var _allTransactions = [];
var _historyFilter = 'paid';

function renderHistory(append) {
    var list = document.getElementById('historyList');
    if (!append) {
        list.innerHTML = '';
    }
    var servicesOnly = _allTransactions.filter(function(tx) {
        return tx.type === 'stars' || tx.type === 'premium' || tx.type === 'nft' || tx.type === 'gift' || tx.type === 'game' || tx.type === 'post_stars';
    });
    var filtered = _historyFilter === 'all' ? servicesOnly : servicesOnly.filter(function(tx) { return tx.status === _historyFilter; });
    if (filtered.length > 0) {
        var start = append ? list.children.length : 0;
        var end = Math.min(filtered.length, _historyRenderCount);
        
        var oldLoader = document.getElementById('historyInfiniteLoader');
        if (oldLoader) oldLoader.remove();
        
        for (var i = start; i < end; i++) {
            var tx = filtered[i];
            var statusClass = tx.status === 'paid' ? 'status-paid' : tx.status === 'pending' ? 'status-pending' : 'status-canceled';
            var statusText = tx.status === 'paid' ? t('hist_paid') : tx.status === 'pending' ? t('hist_pending') : t('hist_canceled');
            
            var typeIcon = '<i class="fas fa-cubes"></i>';
            var typeLabel = 'Xizmat';
            if (tx.type === 'stars') { typeIcon = '<i class="fas fa-star"></i>'; typeLabel = 'Stars'; }
            else if (tx.type === 'premium') { typeIcon = '<i class="fas fa-gem"></i>'; typeLabel = 'Premium'; }
            else if (tx.type === 'nft') { typeIcon = '<i class="fas fa-layer-group"></i>'; typeLabel = 'NFT'; }
            else if (tx.type === 'gift') { typeIcon = '<i class="fas fa-gift"></i>'; typeLabel = 'Gift'; }
            else if (tx.type === 'post_stars') { typeIcon = '<i class="fas fa-paper-plane"></i>'; typeLabel = 'Post Stars'; }
            else if (tx.type === 'game') { typeIcon = '<i class="fas fa-gamepad"></i>'; typeLabel = 'Game'; }
            
            var userText = '';
            if (tx.username) {
                if (tx.type === 'post_stars') {
                    userText = escapeHTML(tx.username) + '<br>';
                } else if (tx.username.indexOf('ID:') === 0) {
                    userText = escapeHTML(tx.username) + '<br>';
                } else {
                    var ustr = tx.username.indexOf('@') === 0 ? tx.username : '@' + tx.username;
                    userText = t('hist_username') + ': ' + escapeHTML(ustr) + '<br>';
                }
            }
            
            var item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = '<div class="transaction-header"><div class="transaction-type">' + typeIcon + ' ' + typeLabel + '</div><div class="transaction-status ' + statusClass + '">' + statusText + '</div></div><div class="transaction-details">' + userText + t('hist_amount') + ': ' + escapeHTML(tx.amount) + '<br>' + t('hist_sum') + ': ' + formatNumber(tx.price) + ' ' + t('currency') + '<br>' + t('hist_date') + ': ' + escapeHTML(tx.date) + '</div>';
            list.appendChild(item);
        }
        
        if (end < filtered.length) {
            var loader = document.createElement('div');
            loader.id = 'historyInfiniteLoader';
            loader.style.textAlign = 'center';
            loader.style.padding = '12px';
            loader.style.fontSize = '12px';
            loader.style.color = 'var(--tg-hint)';
            loader.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuklanmoqda...';
            list.appendChild(loader);
        }
    } else {
        if (!append) {
            list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>' + t('hist_empty') + '</p></div>';
        }
    }
}

function filterHistory(status, el) {
    var tabs = document.querySelectorAll('.history-filter-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    el.classList.add('active');
    _historyRenderCount = 8;
    _historyFilter = status;
    renderHistory();
}

function loadHistory() {
    if (!currentUser) return;
    var list = document.getElementById('historyList');
    list.innerHTML = skeletonHistory();
    _historyRenderCount = 8;
    apiCall('get_history', { user_id: currentUser.id }, function (result) {
        list.innerHTML = '';
        if (result && result.success && result.transactions && result.transactions.length > 0) {
            _sectionEmpty.history = false;
            _stopPoll('history');
            _allTransactions = result.transactions;
            renderHistory();
        } else {
            _allTransactions = [];
            list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>' + t('hist_empty') + '</p></div>';
            _sectionEmpty.history = true;
            if (_sectionVisible.history) _startPoll('history', loadHistory);
        }
    });
}

function switchTab(index, element) {
    if (index === activeTab) return;
    var tabs = ['homeTab', 'topTab', 'gameTab', 'accountTab', 'historyTab', 'balanceTab'];
    var contents = document.querySelectorAll('.tab-content');
    var navItems = document.querySelectorAll('.nav-item');
    for (var i = 0; i < contents.length; i++) contents[i].classList.remove('active');
    for (var j = 0; j < navItems.length; j++) navItems[j].classList.remove('active');
    document.getElementById(tabs[index]).classList.add('active');
    if (element) {
        element.classList.add('active');
    }
    _setAllSectionsHidden();
    activeTab = index;
    updateNavBackground();
    if (index === 1) {
        _sectionVisible.top = true;
        loadTop('daily');
        loadTopTicker();
        if (_sectionEmpty.top) _startPoll('top', function () { loadTop(_currentTopPeriod); });
    } else if (index === 2) {
        _sectionVisible.game = true;
        showServicesMainView();
    } else if (index === 3) {
        var fill = document.getElementById('wgProgressFill');
        if (fill) fill.style.width = '0%';
        var sub = document.getElementById('wgSubText');
        if (sub) sub.textContent = t('loading');
        setTimeout(function () { loadStats(); }, 50);
    } else if (index === 4) {
        _historyFilter = 'paid';
        var ftabs = document.querySelectorAll('.history-filter-tab');
        for (var fi = 0; fi < ftabs.length; fi++) ftabs[fi].classList.remove('active');
        if (ftabs[0]) ftabs[0].classList.add('active');
        _sectionVisible.history = true;
        loadHistory();
        if (_sectionEmpty.history) _startPoll('history', loadHistory);
    } else if (index === 5) {
        var card = document.getElementById('transferCard');
        var topUp = document.getElementById('topUpCard');
        var btn = document.getElementById('transferToggleBtn');
        if (card) card.style.display = 'none';
        if (topUp) topUp.style.display = 'block';
        if (btn) btn.innerHTML = 'Transfer';
        resetTransferFields();
        loadBalanceHistory();
        initBalanceAnimation();
    } else {
        _stopPoll('top');
        _stopPoll('history');
    }
}

function switchCategory(category) {
    document.getElementById('starsContent').style.display = 'none';
    document.getElementById('premiumContent').style.display = 'none';
    document.getElementById('giftContent').style.display = 'none';
    document.getElementById('nftContent').style.display = 'none';
    var tabs = document.querySelectorAll('.category-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    event.currentTarget.classList.add('active');
    _sectionVisible.gifts = false;
    _sectionVisible.nfts = false;
    _stopPoll('gifts');
    _stopPoll('nfts');
    if (category === 'stars') {
        document.getElementById('starsContent').style.display = 'block';
    } else if (category === 'premium') {
        document.getElementById('premiumContent').style.display = 'block';
    } else if (category === 'gift') {
        setGiftMode('list');
        document.getElementById('giftContent').style.display = 'block';
        _sectionVisible.gifts = true;
        if (!giftsLoaded) {
            loadGiftData();
        } else if (_sectionEmpty.gifts) {
            _startPoll('gifts', loadGiftData);
        }
    } else if (category === 'nft') {
        document.getElementById('nftContent').style.display = 'block';
        _sectionVisible.nfts = true;
        if (!nftsLoaded) {
            loadNftData();
        } else if (_sectionEmpty.nfts) {
            _startPoll('nfts', loadNftData);
        }
    }
}

function switchTopPeriod(period, element) {
    var tabs = document.querySelectorAll('.top-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    element.classList.add('active');
    _stopPoll('top');
    loadTop(period);
    if (_sectionEmpty.top && _sectionVisible.top) {
        _startPoll('top', function () { loadTop(_currentTopPeriod); });
    }
}

function skeletonGame() {
    var h = '<div class="gift-grid">';
    for (var i = 0; i < 8; i++) h += '<div class="skeleton-gift"><div class="sk-img"></div><div class="sk-line short"></div><div class="sk-line shorter"></div></div>';
    return h + '</div>';
}

function loadGameData(gameType) {
    selectedGameType = gameType;
    var apiGameType = gameType;
    if (gameType === 'freefire') apiGameType = 'free-fire-cis-new';
    var grid = document.getElementById('gameGrid');
    var wrap = document.getElementById('gameBuyWrap');
    grid.innerHTML = skeletonGame();
    wrap.style.display = 'none';
    selectedGameId = null;
    selectedGameName = null;
    selectedGamePrice = 0;
    document.getElementById('gamePlayerId').value = '';

    apiCall('get_game_services', { game: apiGameType }, function (result) {
        grid.innerHTML = '';
        if (!result || !result.success || !result.data || result.data.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-gamepad"></i><p>' + t('gift_empty') + '</p></div>';
            return;
        }
        var container = document.createElement('div');
        container.className = 'gift-grid';
        for (var i = 0; i < result.data.length; i++) {
            (function (item) {
                var card = document.createElement('div');
                card.className = 'gift-card';
                card.setAttribute('data-id', item.id);
                var img = document.createElement('img');
                img.src = item.image || 'https://www.dev-core.duckdns.org/StarsBot/tgs/uc.webp';
                img.className = 'gift-img';
                img.alt = '';
                img.onerror = function () { this.src = 'https://www.dev-core.duckdns.org/StarsBot/tgs/uc.webp'; };
                var stars = document.createElement('div');
                stars.className = 'gift-stars';
                stars.textContent = item.name + (apiGameType === 'pubg-mobile' ? ' UC' : '');
                var priceEl = document.createElement('div');
                priceEl.className = 'gift-price';
                priceEl.textContent = formatNumber(item.price_uzs) + ' so\'m';
                card.appendChild(img);
                card.appendChild(stars);
                card.appendChild(priceEl);
                card.onclick = function () {
                    var all = container.querySelectorAll('.gift-card');
                    for (var j = 0; j < all.length; j++) all[j].classList.remove('gift-card-selected');
                    card.classList.add('gift-card-selected');
                    selectedGameId = item.id;
                    selectedGameName = item.name;
                    selectedGamePrice = parseInt(item.price_uzs);
                    wrap.style.display = 'block';
                };
                container.appendChild(card);
            })(result.data[i]);
        }
        grid.appendChild(container);
    });
}

function switchGameFilter(gameType, element) {
    var tabs = document.querySelectorAll('#gameTab .top-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    element.classList.add('active');
    loadGameData(gameType);
}

function createGameOrder() {
    if (!selectedGameId) { tg.showAlert(t('err_game')); return; }
    var playerId = document.getElementById('gamePlayerId').value.trim();
    if (!playerId || playerId.length < 2) { tg.showAlert(t('err_player_id')); return; }
    showLoadingModal(t('order_creating'));
    var apiGameType = selectedGameType;
    if (selectedGameType === 'freefire') apiGameType = 'free-fire-cis-new';
    apiCall('create_game_order', {
        buyer_id: currentUser.id,
        game: apiGameType,
        product_id: selectedGameId,
        product_name: selectedGameName,
        price: selectedGamePrice,
        player_id: playerId,
        payment_method: paymentMethods.game
    }, function (result) {
        hideLoadingModal();
        if (result && result.success) {
            if (result.paid_via_balance) {
                tg.showAlert("O'yin hisobini to'ldirish buyurtmasi muvaffaqiyatli bajarildi!");
                loadStats();
            } else {
                var gameLabel = apiGameType === 'pubg-mobile' ? 'PUBG' : 'FreeFire';
                var packageSuffix = apiGameType === 'pubg-mobile' ? ' UC' : '';
                showPaymentModal(result.pay_url, selectedGameName + packageSuffix + ' (' + gameLabel + ') - ' + formatNumber(result.price) + ' ' + t('currency') + '\n\n' + t('pay_redirect'));
            }
        } else {
            tg.showAlert(result.error || t('err_generic'));
        }
    });
}

window.addEventListener('resize', updateNavBackground);



var paymentMethods = {
    stars: 'inco',
    premium: 'inco',
    gift: 'inco',
    nft: 'inco',
    game: 'inco'
};

function showServicesMainView() {
    var mainView = document.getElementById('servicesMainView');
    var gamesView = document.getElementById('gamesServiceView');
    var gwView = document.getElementById('giveawaysServiceView');
    var gwDetailView = document.getElementById('giveawayDetailSubView');
    var pvpView = document.getElementById('pvpGamesView');
    var tgaccView = document.getElementById('tgAccountsServiceView');
    if (gamesView) gamesView.style.display = 'none';
    if (gwView) gwView.style.display = 'none';
    if (gwDetailView) gwDetailView.style.display = 'none';
    if (pvpView) pvpView.style.display = 'none';
    if (tgaccView) tgaccView.style.display = 'none';
    if (mainView) mainView.style.display = 'block';
    if (window._fuelpuck_enabled === false) {
        var promoBanner = document.querySelector('.fuelpuck-promo-banner');
        if (promoBanner) promoBanner.style.display = 'none';
        var pvpCard = document.querySelector('.pvp-service-card');
        if (pvpCard) pvpCard.style.display = 'none';
    }
}

function openPvpGamesView() {
    var mainView = document.getElementById('servicesMainView');
    var gamesView = document.getElementById('gamesServiceView');
    var gwView = document.getElementById('giveawaysServiceView');
    var gwDetailView = document.getElementById('giveawayDetailSubView');
    var pvpView = document.getElementById('pvpGamesView');
    var tgaccView = document.getElementById('tgAccountsServiceView');
    if (mainView) mainView.style.display = 'none';
    if (gamesView) gamesView.style.display = 'none';
    if (gwView) gwView.style.display = 'none';
    if (gwDetailView) gwDetailView.style.display = 'none';
    if (tgaccView) tgaccView.style.display = 'none';
    if (pvpView) pvpView.style.display = 'block';
}

function openFuelPuckGame() {
    if (window.Telegram && window.Telegram.WebApp) {
        if (window.Telegram.WebApp.initData) {
            try { sessionStorage.setItem('tg_init_data', window.Telegram.WebApp.initData); } catch (e) {}
        }
        if (typeof window.Telegram.WebApp.openTelegramLink === 'function') {
            window.Telegram.WebApp.openTelegramLink('https://t.me/StarsFuelBot/fuelpuck');
            return;
        }
    }
    window.location.href = 'webapp/fuelpuck/index.php' + (window.location.search || '') + (window.location.hash || '');
}

function openGamesView() {
    var mainView = document.getElementById('servicesMainView');
    var gamesView = document.getElementById('gamesServiceView');
    var gwView = document.getElementById('giveawaysServiceView');
    var gwDetailView = document.getElementById('giveawayDetailSubView');
    var tgaccView = document.getElementById('tgAccountsServiceView');
    if (mainView) mainView.style.display = 'none';
    if (gwView) gwView.style.display = 'none';
    if (gwDetailView) gwDetailView.style.display = 'none';
    if (tgaccView) tgaccView.style.display = 'none';
    if (gamesView) gamesView.style.display = 'block';
    loadGameData('pubg-mobile');
}

var currentTgAccTab = 'buy';

function switchTgAccTab(tab, el) {
    currentTgAccTab = tab;
    var tabBuy = document.getElementById('tgAccTabBuy');
    var tabMy = document.getElementById('tgAccTabMy');
    var wrapBuy = document.getElementById('tgAccBuyWrap');
    var wrapMy = document.getElementById('tgAccMyWrap');
    if (tabBuy) tabBuy.classList.toggle('active', tab === 'buy');
    if (tabMy) tabMy.classList.toggle('active', tab === 'my');
    if (wrapBuy) wrapBuy.style.display = (tab === 'buy') ? 'block' : 'none';
    if (wrapMy) wrapMy.style.display = (tab === 'my') ? 'block' : 'none';
    if (tab === 'buy') {
        loadTgAccounts();
    } else {
        loadMyTgAccounts();
    }
}

function openTgAccountsView() {
    var mainView = document.getElementById('servicesMainView');
    var gamesView = document.getElementById('gamesServiceView');
    var gwView = document.getElementById('giveawaysServiceView');
    var gwDetailView = document.getElementById('giveawayDetailSubView');
    var pvpView = document.getElementById('pvpGamesView');
    var tgaccView = document.getElementById('tgAccountsServiceView');
    if (mainView) mainView.style.display = 'none';
    if (gamesView) gamesView.style.display = 'none';
    if (gwView) gwView.style.display = 'none';
    if (gwDetailView) gwDetailView.style.display = 'none';
    if (pvpView) pvpView.style.display = 'none';
    if (tgaccView) tgaccView.style.display = 'block';
    switchTgAccTab('buy', document.getElementById('tgAccTabBuy'));
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '🌐';
    var codePoints = countryCode.toUpperCase().split('').map(function (c) {
        return 127397 + c.charCodeAt(0);
    });
    return String.fromCodePoint.apply(null, codePoints);
}

function copyTextToClipboard(text, successMsg) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.showAlert === 'function') {
                window.Telegram.WebApp.showAlert(successMsg || (t('copied') || 'Nusxalandi!'));
            } else {
                alert(successMsg || 'Nusxalandi!');
            }
        });
    } else {
        var input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.showAlert === 'function') {
            window.Telegram.WebApp.showAlert(successMsg || (t('copied') || 'Nusxalandi!'));
        } else {
            alert(successMsg || 'Nusxalandi!');
        }
    }
}

function buyTgAccount(countryCode, countryName, price) {
    var confirmText = countryName + ' (' + countryCode + ')\n' + t('price') + ': ' + formatNumber(price) + ' ' + t('currency') + '\n\n' + t('tgacc_warn_confirm');
    var doPurchase = function () {
        showLoadingModal(t('loading') || 'Yuklanmoqda...');
        apiCall('buy_tg_account', { country_code: countryCode }, function (res) {
            hideLoadingModal();
            if (!res || !res.success) {
                var err = (res && res.error) ? res.error : t('err_generic');
                if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.showAlert === 'function') {
                    window.Telegram.WebApp.showAlert(err);
                } else {
                    alert(err);
                }
                loadTgAccounts();
                return;
            }
            loadStats();
            var phone = res.order ? res.order.phone_number : '';
            var successMsg = 'Raqam muvaffaqiyatli olindi: ' + phone + '\n\n' + t('tgacc_sms_warn');
            if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.showAlert === 'function') {
                window.Telegram.WebApp.showAlert(successMsg);
            } else {
                alert(successMsg);
            }
            switchTgAccTab('my', document.getElementById('tgAccTabMy'));
        });
    };

    if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.showConfirm === 'function') {
        window.Telegram.WebApp.showConfirm(confirmText, function (confirmed) {
            if (confirmed) doPurchase();
        });
    } else {
        if (confirm(confirmText)) doPurchase();
    }
}

function loadTgAccounts() {
    var container = document.getElementById('tgAccountsListContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    apiCall('get_tg_accounts', {}, function (result) {
        container.innerHTML = '';
        if (!result || !result.success || !result.accounts || result.accounts.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fab fa-telegram"></i><p>' + t('tgacc_empty') + '</p></div>';
            return;
        }
        var grid = document.createElement('div');
        grid.className = 'tgacc-grid';
        for (var i = 0; i < result.accounts.length; i++) {
            (function (acc) {
                var card = document.createElement('div');
                card.className = 'tgacc-card';
                var flagEl = document.createElement('div');
                flagEl.className = 'tgacc-flag';
                flagEl.textContent = getFlagEmoji(acc.code);
                var nameEl = document.createElement('div');
                nameEl.className = 'tgacc-name';
                nameEl.textContent = acc.name || acc.code;
                var codeEl = document.createElement('div');
                codeEl.className = 'tgacc-code';
                codeEl.textContent = acc.code;
                var badgeEl = document.createElement('div');
                var isAvailable = acc.qty > 0;
                badgeEl.className = 'tgacc-badge ' + (isAvailable ? 'tgacc-badge-available' : 'tgacc-badge-empty');
                badgeEl.textContent = isAvailable ? (t('tgacc_available') + ': ' + acc.qty + ' ' + t('tgacc_dona')) : t('tgacc_out_of_stock');
                var priceEl = document.createElement('div');
                priceEl.className = 'tgacc-price';
                priceEl.textContent = formatNumber(acc.price) + ' ' + t('currency');
                var btn = document.createElement('button');
                btn.className = 'tgacc-buy-btn';
                btn.innerHTML = isAvailable ? ('<i class="fas fa-shopping-cart"></i> ' + t('buy_btn')) : ('<i class="fas fa-ban"></i> ' + t('tgacc_out_of_stock'));
                if (!isAvailable) {
                    btn.disabled = true;
                } else {
                    btn.onclick = function () {
                        buyTgAccount(acc.code, acc.name, acc.price);
                    };
                }
                card.appendChild(flagEl);
                card.appendChild(nameEl);
                card.appendChild(codeEl);
                card.appendChild(badgeEl);
                card.appendChild(priceEl);
                card.appendChild(btn);
                grid.appendChild(card);
            })(result.accounts[i]);
        }
        container.appendChild(grid);
    });
}

function loadMyTgAccounts() {
    var container = document.getElementById('tgAccMyListContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    apiCall('get_my_tg_accounts', {}, function (result) {
        container.innerHTML = '';
        if (!result || !result.success || !result.orders || result.orders.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-mobile-alt"></i><p>' + t('tgacc_my_empty') + '</p></div>';
            return;
        }
        var list = document.createElement('div');
        list.className = 'tgacc-orders-list';
        for (var i = 0; i < result.orders.length; i++) {
            (function (ord) {
                var card = document.createElement('div');
                card.className = 'tgacc-order-card';
                card.id = 'tgacc-order-' + ord.id;

                var header = document.createElement('div');
                header.className = 'tgacc-order-header';

                var countryEl = document.createElement('div');
                countryEl.className = 'tgacc-order-country';
                var flag = document.createElement('span');
                flag.className = 'tgacc-order-flag';
                flag.textContent = getFlagEmoji(ord.country_code);
                var cname = document.createElement('span');
                cname.textContent = (ord.country_name || ord.country_code) + ' (' + (ord.country_code || '').toUpperCase() + ')';
                countryEl.appendChild(flag);
                countryEl.appendChild(cname);

                var badge = document.createElement('div');
                var isCompleted = !!ord.sms_code;
                badge.className = 'tgacc-order-badge ' + (isCompleted ? 'tgacc-order-badge-completed' : 'tgacc-order-badge-pending');
                badge.textContent = isCompleted ? (t('hist_paid') || 'Bajarildi') : (t('hist_pending') || 'Kutilmoqda');

                header.appendChild(countryEl);
                header.appendChild(badge);

                var numRow = document.createElement('div');
                numRow.className = 'tgacc-number-row';

                var numVal = document.createElement('div');
                numVal.className = 'tgacc-number-val';
                numVal.textContent = ord.phone_number;

                var copyBtn = document.createElement('button');
                copyBtn.className = 'tgacc-icon-btn';
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> ' + (t('copy') || 'Nusxa');
                copyBtn.onclick = function () {
                    copyTextToClipboard(ord.phone_number, t('tgacc_copied'));
                };

                numRow.appendChild(numVal);
                numRow.appendChild(copyBtn);

                var actionsRow = document.createElement('div');
                actionsRow.className = 'tgacc-card-actions';

                var moreBtn = document.createElement('button');
                moreBtn.className = 'tgacc-more-btn';
                moreBtn.innerHTML = '<span>' + (t('tgacc_more') || "Ko'proq") + '</span> <i class="fas fa-chevron-down"></i>';
                actionsRow.appendChild(moreBtn);

                var orderCreated = ord.created_at ? new Date(ord.created_at.replace(/-/g, '/')).getTime() : Date.now();
                var orderAgeMin = isNaN(orderCreated) ? 0 : Math.floor((Date.now() - orderCreated) / 60000);
                var isWithinActiveWindow = orderAgeMin < 20;

                if (!ord.sms_code || isWithinActiveWindow) {
                    var quickSmsBtn = document.createElement('button');
                    quickSmsBtn.className = 'tgacc-sms-quick-btn';
                    var btnText = ord.sms_code ? (t('tgacc_btn_resend_code') || 'Qayta SMS olish') : (t('tgacc_btn_get_code') || 'SMS kod olish');
                    quickSmsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> ' + btnText;
                    quickSmsBtn.onclick = function () {
                        checkTgAccountCode(ord.id, quickSmsBtn, function (newCode, newPass) {
                            ord.sms_code = newCode;
                            if (newPass) ord.two_step_pass = newPass;
                            quickSmsBtn.innerHTML = '<i class="fas fa-sync-alt"></i> ' + (t('tgacc_btn_resend_code') || 'Qayta SMS olish');
                            if (detailsPanel.style.display === 'none') {
                                detailsPanel.style.display = 'flex';
                                moreBtn.innerHTML = '<span>' + (t('tgacc_close') || "Yopish") + '</span> <i class="fas fa-chevron-up"></i>';
                            }
                        });
                    };
                    actionsRow.appendChild(quickSmsBtn);
                }

                var detailsPanel = document.createElement('div');
                detailsPanel.className = 'tgacc-details-panel';
                detailsPanel.style.display = 'none';

                if (ord.cheque_id) {
                    var chequeRow = document.createElement('div');
                    chequeRow.className = 'tgacc-detail-row';
                    var chLabel = document.createElement('span');
                    chLabel.className = 'tgacc-detail-label';
                    chLabel.innerHTML = '<i class="fas fa-receipt"></i> ' + (t('tgacc_cheque') || 'Cheque ID');
                    var chValWrap = document.createElement('div');
                    chValWrap.style.display = 'flex';
                    chValWrap.style.alignItems = 'center';
                    chValWrap.style.gap = '6px';
                    var chVal = document.createElement('span');
                    chVal.className = 'tgacc-detail-val';
                    chVal.textContent = ord.cheque_id;
                    var chCopy = document.createElement('button');
                    chCopy.className = 'tgacc-icon-btn';
                    chCopy.style.padding = '3px 6px';
                    chCopy.style.fontSize = '10px';
                    chCopy.innerHTML = '<i class="fas fa-copy"></i>';
                    chCopy.onclick = function () {
                        copyTextToClipboard(ord.cheque_id, t('tgacc_cheque_copied') || 'Cheque ID nusxalandi');
                    };
                    chValWrap.appendChild(chVal);
                    chValWrap.appendChild(chCopy);
                    chequeRow.appendChild(chLabel);
                    chequeRow.appendChild(chValWrap);
                    detailsPanel.appendChild(chequeRow);
                }

                var dateRow = document.createElement('div');
                dateRow.className = 'tgacc-detail-row';
                var dtLabel = document.createElement('span');
                dtLabel.className = 'tgacc-detail-label';
                dtLabel.innerHTML = '<i class="fas fa-calendar-alt"></i> ' + (t('tgacc_order_date') || 'Xarid vaqti');
                var dtVal = document.createElement('span');
                dtVal.className = 'tgacc-detail-val';
                dtVal.textContent = ord.created_at || '';
                dateRow.appendChild(dtLabel);
                dateRow.appendChild(dtVal);
                detailsPanel.appendChild(dateRow);

                var priceRow = document.createElement('div');
                priceRow.className = 'tgacc-detail-row';
                var prLabel = document.createElement('span');
                prLabel.className = 'tgacc-detail-label';
                prLabel.innerHTML = '<i class="fas fa-coins"></i> ' + (t('hist_sum') || 'Summa');
                var prVal = document.createElement('span');
                prVal.className = 'tgacc-order-price';
                prVal.textContent = formatNumber(ord.price) + ' ' + t('currency');
                priceRow.appendChild(prLabel);
                priceRow.appendChild(prVal);
                detailsPanel.appendChild(priceRow);

                var smsContainer = document.createElement('div');
                smsContainer.className = 'tgacc-sms-wrapper';
                smsContainer.id = 'tgacc-sms-wrap-' + ord.id;

                if (ord.sms_code) {
                    renderTgAccCodeBox(smsContainer, ord.sms_code, ord.two_step_pass);
                } else {
                    renderTgAccActionBox(smsContainer, ord.id);
                }
                detailsPanel.appendChild(smsContainer);

                moreBtn.onclick = function () {
                    var isOpen = detailsPanel.style.display !== 'none';
                    detailsPanel.style.display = isOpen ? 'none' : 'flex';
                    moreBtn.innerHTML = isOpen
                        ? ('<span>' + (t('tgacc_more') || "Ko'proq") + '</span> <i class="fas fa-chevron-down"></i>')
                        : ('<span>' + (t('tgacc_close') || "Yopish") + '</span> <i class="fas fa-chevron-up"></i>');
                };

                card.appendChild(header);
                card.appendChild(numRow);
                card.appendChild(actionsRow);
                card.appendChild(detailsPanel);
                list.appendChild(card);
            })(result.orders[i]);
        }
        container.appendChild(list);
    });
}

function renderTgAccCodeBox(container, code, pass) {
    container.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'tgacc-code-box';

    var cheader = document.createElement('div');
    cheader.className = 'tgacc-code-header';
    cheader.innerHTML = '<i class="fas fa-key"></i> Telegram SMS Kodi';

    var crow = document.createElement('div');
    crow.className = 'tgacc-code-row';

    var cval = document.createElement('div');
    cval.className = 'tgacc-code-val';
    cval.textContent = code;

    var copyCodeBtn = document.createElement('button');
    copyCodeBtn.className = 'tgacc-icon-btn';
    copyCodeBtn.innerHTML = '<i class="fas fa-copy"></i> ' + (t('copy') || 'Nusxa');
    copyCodeBtn.onclick = function () {
        copyTextToClipboard(code, t('tgacc_code_copied'));
    };

    crow.appendChild(cval);
    crow.appendChild(copyCodeBtn);
    box.appendChild(cheader);
    box.appendChild(crow);

    if (pass) {
        var prow = document.createElement('div');
        prow.className = 'tgacc-pass-row';
        var ptxt = document.createElement('span');
        ptxt.textContent = '2FA Parol: ';
        var pval = document.createElement('span');
        pval.className = 'tgacc-pass-val';
        pval.textContent = pass;
        var pcopy = document.createElement('button');
        pcopy.className = 'tgacc-icon-btn';
        pcopy.style.padding = '3px 6px';
        pcopy.style.fontSize = '10px';
        pcopy.innerHTML = '<i class="fas fa-copy"></i>';
        pcopy.onclick = function () {
            copyTextToClipboard(pass, t('tgacc_pass_copied'));
        };
        ptxt.appendChild(pval);
        prow.appendChild(ptxt);
        prow.appendChild(pcopy);
        box.appendChild(prow);
    }

    container.appendChild(box);
}

function renderTgAccActionBox(container, orderId) {
    container.innerHTML = '';
    var act = document.createElement('div');
    act.className = 'tgacc-action-area';

    var warnEl = document.createElement('div');
    warnEl.className = 'tgacc-action-warn';
    warnEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> ' + t('tgacc_sms_warn');

    var hint = document.createElement('div');
    hint.className = 'tgacc-hint-text';
    hint.textContent = t('tgacc_sms_hint');

    var btn = document.createElement('button');
    btn.className = 'tgacc-action-btn';
    btn.innerHTML = '<i class="fas fa-sync-alt"></i> ' + t('tgacc_btn_get_code');
    btn.onclick = function () {
        checkTgAccountCode(orderId, btn);
    };

    act.appendChild(warnEl);
    act.appendChild(hint);
    act.appendChild(btn);
    container.appendChild(act);
}

function checkTgAccountCode(orderId, btn, onDone) {
    if (!btn || btn.classList.contains('loading')) return;
    btn.classList.add('loading');
    var origHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ' + t('tgacc_btn_check_code') + '...';

    apiCall('get_tg_account_code', { order_id: orderId }, function (res) {
        btn.classList.remove('loading');
        btn.innerHTML = origHtml;
        if (!res || !res.success) {
            var msg = (res && res.error) ? res.error : 'SMS kod hali kelmadi. Telegram orqali kod yuboring va qayta tekshiring.';
            if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.showAlert === 'function') {
                window.Telegram.WebApp.showAlert(msg);
            } else {
                alert(msg);
            }
            return;
        }

        var orderCard = document.getElementById('tgacc-order-' + orderId);
        if (orderCard) {
            var badge = orderCard.querySelector('.tgacc-order-badge');
            if (badge) {
                badge.className = 'tgacc-order-badge tgacc-order-badge-completed';
                badge.textContent = t('hist_paid') || 'Bajarildi';
            }
        }

        var wrap = document.getElementById('tgacc-sms-wrap-' + orderId);
        if (wrap) {
            renderTgAccCodeBox(wrap, res.code, res.pass);
        }

        if (typeof onDone === 'function') {
            onDone(res.code, res.pass);
        }

        var alertMsg = 'SMS kod keldi: ' + res.code;
        if (res.pass) alertMsg += '\n2FA Parol: ' + res.pass;
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.showAlert === 'function') {
            window.Telegram.WebApp.showAlert(alertMsg);
        } else {
            alert(alertMsg);
        }
    });
}

var currentGiveawayFilter = 'active';
var giveawaysData = [];
var giveawayCountdownInterval = null;

function openGiveawaysView() {
    var mainView = document.getElementById('servicesMainView');
    var gamesView = document.getElementById('gamesServiceView');
    var gwListView = document.getElementById('giveawaysServiceView');
    var gwDetailView = document.getElementById('giveawayDetailSubView');
    var tgaccView = document.getElementById('tgAccountsServiceView');
    if (mainView) mainView.style.display = 'none';
    if (gamesView) gamesView.style.display = 'none';
    if (gwDetailView) gwDetailView.style.display = 'none';
    if (tgaccView) tgaccView.style.display = 'none';
    if (gwListView) gwListView.style.display = 'block';
    loadGiveaways();
}

function showGiveawaysListView() {
    openGiveawaysView();
}

function openGiveawayDetailView(gwIdOrCode) {
    var mainView = document.getElementById('servicesMainView');
    var gamesView = document.getElementById('gamesServiceView');
    var gwListView = document.getElementById('giveawaysServiceView');
    var gwDetailView = document.getElementById('giveawayDetailSubView');
    var tgaccView = document.getElementById('tgAccountsServiceView');
    var body = document.getElementById('gwDetailSubViewBody');
    
    if (mainView) mainView.style.display = 'none';
    if (gamesView) gamesView.style.display = 'none';
    if (gwListView) gwListView.style.display = 'none';
    if (tgaccView) tgaccView.style.display = 'none';
    if (gwDetailView) gwDetailView.style.display = 'block';
    
    closeGiveawayModal();
    
    if (!body) return;
    body.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    var uid = (currentUser && currentUser.id) ? currentUser.id : ((window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id : '');
    apiCall('get_giveaway_detail', { id_or_code: gwIdOrCode, user_id: uid }, function (res) {
        if (!res || !res.success || !res.giveaway) {
            body.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Giveaway topilmadi</p></div>';
            return;
        }
        
        var gw = res.giveaway;
        renderGiveawayDetailSubView(gw);
    });
}

function openGiveawayModal(gwIdOrCode) {
    openGiveawayDetailView(gwIdOrCode);
}

function renderGiveawayDetailSubView(gw) {
    var body = document.getElementById('gwDetailSubViewBody');
    if (!body) return;
    
    var giftImgUrl = 'tgs/GIFTS/' + gw.gift_id + '.webp';
    
    var html = '<div class="order-card" style="text-align:center; padding: 12px 10px; margin-bottom: 10px; position:relative; overflow:hidden;">'
        + '<div style="position:absolute;top:-20px;left:50%;transform:translateX(-50%);width:100px;height:100px;background:radial-gradient(circle, color-mix(in srgb, var(--tg-btn) 22%, transparent) 0%, transparent 70%);border-radius:50%;pointer-events:none;"></div>'
        + '<img src="' + giftImgUrl + '" class="giveaway-gift-img" style="width:52px;height:52px;margin:0 auto 6px;display:block;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.25));position:relative;z-index:1;" onerror="this.style.display=\'none\'">'
        + '<div style="font-size:15px;font-weight:800;color:var(--tg-text);position:relative;z-index:1;"><i class="fas fa-star" style="color:#facc15;"></i> ' + formatNumber(gw.gift_stars) + ' Stars</div>'
        + '<div style="font-size:10.5px;color:var(--tg-hint);margin-top:2px;position:relative;z-index:1;">' + formatNumber(gw.gift_price) + ' ' + t('currency') + ' qiymatidagi Telegram Gift</div>'
        + '</div>';
        
    html += '<div class="acc-stats-grid" style="margin-bottom:10px;">'
        + '<div class="acc-stat-card acc-stat-stars" style="padding:9px 11px;border-radius:11px;">'
        + '<div class="acc-stat-icon-wrap acc-icon-star" style="width:24px;height:24px;font-size:10.5px;"><i class="fas fa-trophy"></i></div>'
        + '<div class="acc-stat-label" style="font-size:9.5px;">G\'oliblar soni</div>'
        + '<div class="acc-stat-value" style="font-size:12.5px;">' + gw.winners_count + ' ta</div>'
        + '</div>'
        + '<div class="acc-stat-card acc-stat-orders" style="padding:9px 11px;border-radius:11px;">'
        + '<div class="acc-stat-icon-wrap acc-icon-bag" style="width:24px;height:24px;font-size:10.5px;"><i class="fas fa-users"></i></div>'
        + '<div class="acc-stat-label" style="font-size:9.5px;">Ishtirokchilar</div>'
        + '<div class="acc-stat-value" style="font-size:12.5px;">' + (gw.participants_count || 0) + ' ta</div>'
        + '</div>'
        + '</div>';
        
    if (gw.status === 'active') {
        html += '<div class="order-card" style="text-align:center; padding: 8px 10px; margin-bottom: 10px; border-radius:11px; background: color-mix(in srgb, var(--tg-btn) 7%, transparent); border: 1px solid color-mix(in srgb, var(--tg-btn) 25%, transparent);">'
            + '<div style="font-size:9.5px;font-weight:700;color:var(--tg-hint);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;"><i class="fas fa-hourglass-half" style="color:var(--tg-btn);margin-right:3px;"></i> ' + t('gw_ends_in') + '</div>'
            + '<div class="giveaway-timer-badge gw-timer-badge-large" data-gw-end="' + (gw.end_timestamp || gw.end_date) + '">'
            + '<i class="fas fa-clock gw-clock-spin"></i> <span class="gw-timer-text">...</span></div>'
            + '</div>';
    } else {
        html += '<div class="order-card" style="text-align:center; padding: 8px 10px; margin-bottom: 10px; border-radius:11px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.25);">'
            + '<div style="font-size:12px;font-weight:750;color:#10b981;display:inline-flex;align-items:center;gap:5px;"><i class="fas fa-check-circle"></i> ' + t('gw_ended') + '</div>'
            + '</div>';
    }
    
    if (gw.status === 'active') {
        if (gw.is_joined && gw.user_ticket) {
            html += '<div class="order-card" style="text-align:center; padding: 10px 12px; margin-bottom: 10px; border-radius:11px; border: 1px solid rgba(16, 185, 129, 0.3); background: color-mix(in srgb, #10b981 7%, transparent);">'
                + '<div style="font-size:10px;color:var(--tg-hint);margin-bottom:3px;">Siz ushbu tanlovda qatnashmoqdasiz</div>'
                + '<div class="giveaway-ticket-badge" style="font-size:12.5px;font-weight:800;padding:4px 12px;display:inline-flex;align-items:center;gap:5px;"><i class="fas fa-ticket-alt"></i> ' + t('gw_ticket') + ': ' + gw.user_ticket + '</div>'
                + '<div style="font-size:9.5px;color:#10b981;margin-top:4px;font-weight:600;"><i class="fas fa-shield-alt"></i> Omad tilaymiz! G\'oliblar avtomatik aniqlanadi.</div>'
                + '</div>';
        } else {
            html += '<button class="pill-button" id="joinGwBtn" onclick="joinGiveaway(' + gw.id + ')" style="width:100%; padding: 9px 12px; font-size: 12.5px; font-weight: 800; margin-top: 2px; margin-bottom: 10px; border-radius: 11px; box-shadow: 0 4px 12px color-mix(in srgb, var(--tg-btn) 30%, transparent);">'
                + '<i class="fas fa-gift"></i> <span>' + t('gw_join') + '</span></button>';
        }
    }
    
    if (gw.channels && gw.channels.length > 0) {
        html += '<div class="gw-sponsor-card">'
            + '<div class="gw-sponsor-card-header">'
            + '<div><i class="fas fa-bullhorn"></i> <span>' + t('gw_channels') + '</span></div>'
            + '<span class="gw-sponsor-badge">' + gw.channels.length + ' ta</span>'
            + '</div>'
            + '<div class="gw-sponsor-card-sub">Qatnashish uchun barcha kanallarga a\'zo bo\'ling:</div>'
            + '<div class="gw-sponsor-list">';
        for (var c = 0; c < gw.channels.length; c++) {
            var ch = gw.channels[c];
            var chTitle = ch.title || ch.username || ('Kanal ' + (c + 1));
            var chLink = ch.invite_link || (ch.username ? 'https://t.me/' + ch.username.replace('@', '') : '#');
            html += '<div class="gw-sponsor-item">'
                + '<div class="gw-sponsor-info">'
                + '<div class="gw-sponsor-icon"><i class="fas fa-bullhorn"></i></div>'
                + '<div class="gw-sponsor-name">' + chTitle + '</div>'
                + '</div>'
                + '<a href="' + chLink + '" class="gw-sponsor-btn" target="_blank" onclick="openChannelLink(event, \'' + chLink + '\')"><i class="fas fa-plus"></i> ' + t('gw_subscribe') + '</a>'
                + '</div>';
        }
        html += '</div></div>';
    }
    
    if (gw.status !== 'active') {
        if (gw.winners_data && gw.winners_data.length > 0) {
            html += '<div class="gw-winners-box">'
                + '<div class="gw-winners-title"><i class="fas fa-trophy" style="color:#facc15;"></i> ' + t('gw_winners') + ' (' + gw.winners_data.length + ' ta):</div>'
                + '<div class="gw-winners-list">';
            for (var w = 0; w < gw.winners_data.length; w++) {
                var win = gw.winners_data[w];
                var winName = win.name || win.username || ('Foydalanuvchi ' + (w + 1));
                html += '<div class="gw-winner-row">'
                    + '<span class="gw-winner-name">👤 ' + winName + '</span>'
                    + '<span class="gw-winner-ticket">' + (win.ticket || '') + '</span>'
                    + '</div>';
            }
            html += '</div></div>';
        }
    }
    
    body.innerHTML = html;
    startGiveawayCountdowns();
}

function switchGiveawayFilter(filter, el) {
    currentGiveawayFilter = (filter === 'archive' || filter === 'ended') ? 'ended' : 'active';
    var tabs = document.querySelectorAll('#giveawaysServiceView .top-tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    if (el) el.classList.add('active');
    renderGiveawaysList();
}

function loadGiveaways(callback) {
    var container = document.getElementById('giveawaysListContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    var uid = (currentUser && currentUser.id) ? currentUser.id : '';
    apiCall('get_giveaways', { user_id: uid }, function (result) {
        if (result && result.success && Array.isArray(result.giveaways)) {
            giveawaysData = result.giveaways;
            renderGiveawaysList();
            startGiveawayCountdowns();
        } else {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-gift"></i><p>' + t('gw_empty_active') + '</p></div>';
        }
        if (typeof callback === 'function') callback();
    });
}

function renderGiveawaysList() {
    var container = document.getElementById('giveawaysListContainer');
    if (!container) return;
    container.innerHTML = '';
    
    var filtered = giveawaysData.filter(function (gw) {
        if (currentGiveawayFilter === 'ended' || currentGiveawayFilter === 'archive') {
            return gw.status === 'ended' || gw.status === 'archive';
        }
        return gw.status === 'active' || !gw.status;
    });
    
    if (filtered.length === 0) {
        var emptyKey = currentGiveawayFilter === 'active' ? 'gw_empty_active' : 'gw_empty_archive';
        container.innerHTML = '<div class="empty-state"><i class="fas fa-gift"></i><p>' + t(emptyKey) + '</p></div>';
        return;
    }
    
    var grid = document.createElement('div');
    grid.className = 'giveaways-grid';
    
    for (var i = 0; i < filtered.length; i++) {
        (function (gw) {
            var card = document.createElement('div');
            card.className = 'giveaway-card';
            
            var giftImgUrl = 'tgs/GIFTS/' + gw.gift_id + '.webp';
            
            var header = document.createElement('div');
            header.className = 'giveaway-card-header';
            
            var img = document.createElement('img');
            img.src = giftImgUrl;
            img.className = 'giveaway-gift-img';
            img.onerror = function () { this.style.display = 'none'; };
            
            var main = document.createElement('div');
            main.className = 'giveaway-card-main';
            
            var title = document.createElement('div');
            title.className = 'giveaway-title';
            title.innerHTML = '<span class="giveaway-prize-badge"><i class="fas fa-star"></i> ' + formatNumber(gw.gift_stars) + ' Stars</span>';
            
            var sub = document.createElement('div');
            sub.className = 'giveaway-price-sub';
            sub.textContent = formatNumber(gw.gift_price) + ' ' + t('currency') + ' qiymatidagi Gift';
            
            main.appendChild(title);
            main.appendChild(sub);
            
            if (gw.status === 'active') {
                var timer = document.createElement('div');
                timer.className = 'giveaway-timer-badge';
                timer.setAttribute('data-gw-end', gw.end_timestamp || gw.end_date);
                timer.innerHTML = '<i class="fas fa-clock gw-clock-spin"></i> <span class="gw-timer-text">...</span>';
                main.appendChild(timer);
            } else {
                var ended = document.createElement('div');
                ended.className = 'giveaway-ended-badge';
                ended.innerHTML = '<i class="fas fa-check-circle"></i> ' + t('gw_ended');
                main.appendChild(ended);
            }
            
            header.appendChild(img);
            header.appendChild(main);
            card.appendChild(header);
            
            var meta = document.createElement('div');
            meta.className = 'giveaway-meta-row';
            meta.innerHTML = '<div class="giveaway-meta-item"><i class="fas fa-trophy"></i> ' + gw.winners_count + ' ta g\'olib</div>'
                + '<div class="giveaway-meta-item"><i class="fas fa-users"></i> ' + (gw.participants_count || 0) + ' qatnashchi</div>';
            card.appendChild(meta);
            
            if (gw.is_joined && gw.user_ticket) {
                var ticketWrap = document.createElement('div');
                ticketWrap.innerHTML = '<span class="giveaway-ticket-badge"><i class="fas fa-ticket-alt"></i> ' + t('gw_ticket') + ': ' + gw.user_ticket + '</span>';
                card.appendChild(ticketWrap);
            }
            
            var actionBtn = document.createElement('button');
            actionBtn.className = 'pill-button gw-card-btn';
            
            if (gw.status === 'active') {
                if (gw.is_joined) {
                    actionBtn.className = 'pill-button gw-card-btn joined';
                    actionBtn.innerHTML = '<i class="fas fa-check-circle"></i> ' + t('gw_joined');
                } else {
                    actionBtn.innerHTML = '<i class="fas fa-gift"></i> ' + t('gw_join');
                }
            } else {
                actionBtn.className = 'pill-button gw-card-btn ended';
                actionBtn.innerHTML = '<i class="fas fa-trophy"></i> ' + t('gw_winners');
            }
            card.appendChild(actionBtn);
            
            card.onclick = function () {
                openGiveawayDetailView(gw.id);
            };
            
            grid.appendChild(card);
        })(filtered[i]);
    }
    
    container.appendChild(grid);
}

function startGiveawayCountdowns() {
    if (giveawayCountdownInterval) clearInterval(giveawayCountdownInterval);
    
    function updateTimers() {
        var timerEls = document.querySelectorAll('[data-gw-end]');
        var now = Math.floor(Date.now() / 1000);
        for (var i = 0; i < timerEls.length; i++) {
            var endAttr = timerEls[i].getAttribute('data-gw-end');
            var endTs = 0;
            if (typeof endAttr === 'string' && endAttr.indexOf('-') !== -1) {
                endTs = Math.floor(new Date(endAttr.replace(/-/g, '/')).getTime() / 1000);
            } else {
                endTs = parseInt(endAttr, 10);
            }
            if (!endTs) continue;
            
            var diff = endTs - now;
            var textSpan = timerEls[i].querySelector('.gw-timer-text') || timerEls[i];
            if (diff <= 0) {
                textSpan.textContent = t('gw_ended');
                var icon = timerEls[i].querySelector('.gw-clock-spin');
                if (icon) icon.classList.remove('gw-clock-spin');
            } else {
                var days = Math.floor(diff / 86400);
                var hours = Math.floor((diff % 86400) / 3600);
                var mins = Math.floor((diff % 3600) / 60);
                var secs = diff % 60;
                
                var str = '';
                if (days > 0) str += days + 'k ';
                if (hours > 0 || days > 0) {
                    str += (hours < 10 ? '0' : '') + hours + ':';
                }
                str += (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
                textSpan.textContent = str;
            }
        }
    }
    
    updateTimers();
    giveawayCountdownInterval = setInterval(updateTimers, 1000);
}

function openChannelLink(e, link) {
    if (link && link !== '#') {
        e.preventDefault();
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.openTelegramLink) {
            Telegram.WebApp.openTelegramLink(link);
        } else {
            window.open(link, '_blank');
        }
    }
}

function closeGiveawayModal() {
    var modal = document.getElementById('giveawayDetailModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
}

function joinGiveaway(gwId) {
    var btn = document.getElementById('joinGwBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Tekshirilmoqda...';
    }
    
    var uid = (currentUser && currentUser.id) ? currentUser.id : ((window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id : '');
    var fname = (currentUser && currentUser.first_name) ? currentUser.first_name : ((window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.first_name : '');
    var uname = (currentUser && currentUser.username) ? currentUser.username : ((window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.username : '');
    
    apiCall('join_giveaway', {
        giveaway_id: gwId,
        user_id: uid,
        first_name: fname,
        username: uname
    }, function (res) {
        if (res && res.success) {
            tg.showAlert("Tabriklaymiz! Siz tanlovda muvaffaqiyatli ro'yxatdan o'tdingiz!\n\nSizning biletingiz: " + res.ticket);
            openGiveawayDetailView(gwId);
            loadGiveaways();
        } else {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-gift"></i> <span>' + t('gw_join') + '</span>';
            }
            tg.showAlert(res.error || "Xatolik yuz berdi. Iltimos barcha homiy kanallarga a'zo ekanligingizni tekshiring!");
        }
    });
}

window.openGiveawaysView = openGiveawaysView;
window.showGiveawaysListView = showGiveawaysListView;
window.openGiveawayDetailView = openGiveawayDetailView;
window.showServicesMainView = showServicesMainView;
window.switchGiveawayFilter = switchGiveawayFilter;
window.openGiveawayModal = openGiveawayModal;
window.closeGiveawayModal = closeGiveawayModal;
window.joinGiveaway = joinGiveaway;
window.openChannelLink = openChannelLink;

function selectPaymentMethod(type, method, element) {
    paymentMethods[type] = method;
    var container = element.parentElement;
    var options = container.querySelectorAll('.payment-method-option');
    for (var i = 0; i < options.length; i++) {
        options[i].classList.remove('active');
    }
    element.classList.add('active');
}

function copyText(text, message) {
    var el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
        Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.showAlert(message || "Matn nusxalandi: " + text);
    } else {
        alert(message || "Matn nusxalandi: " + text);
    }
}

function copyUserId() {
    if (!currentUser || !currentUser.id) return;
    var msg = (typeof t === 'function' && t('copied_msg') !== 'copied_msg') ? t('copied_msg') : "ID nusxalandi!";
    copyText(currentUser.id, msg);
}

function showBotOffScreen() {
    detectLang();
    applyTheme();
    var loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.classList.add('hide');
    var appContainer = document.getElementById('appContainer');
    if (appContainer) {
        appContainer.style.display = 'none';
        appContainer.classList.remove('show');
    }
    var existing = document.getElementById('botOffScreen');
    if (existing) existing.remove();

    var offContainer = document.createElement('div');
    offContainer.id = 'botOffScreen';
    offContainer.className = 'bot-off-screen';
    document.body.appendChild(offContainer);

    var uid = currentUser ? currentUser.id : '';

    function getTrans(key, fallback) {
        var str = t(key);
        if (!str || str === key) return fallback;
        return str;
    }

    var title = getTrans('bot_off_title', "Bot hozirda o'chirilgan");
    var idLabel = getTrans('bot_off_id', "ID raqamingiz");
    var copyBtn = getTrans('copy_btn', "Nusxa olish");

    apiCall('get_stats', { user_id: uid }, function (res) {
        var bal = (res && res.success) ? (res.balance || 0) : 0;
        var descText = '';
        if (bal > 0) {
            var formattedBal = formatNumber(bal) + ' ' + t('currency');
            var template = getTrans('bot_off_balance', 'Sizning balansingiz {balance} shuncha va pulingiz xavfsiz holatda saqlanmoqda.');
            descText = template.replace('{balance}', formattedBal);
        } else {
            descText = getTrans('bot_off_nobalance', 'Bot hozirda nofaol holatda va pulingiz xavfsiz holatda saqlanmoqda.');
        }

        offContainer.innerHTML = '<div class="bot-off-card">'
            + '<div class="bot-off-icon-wrap"><i class="fas fa-power-off"></i></div>'
            + '<h2 class="bot-off-title">' + escapeHTML(title) + '</h2>'
            + '<p class="bot-off-desc">' + escapeHTML(descText) + '</p>'
            + '<div class="bot-off-id-box">'
            + '<span class="bot-off-id-label">' + escapeHTML(idLabel) + ':</span>'
            + '<span class="bot-off-id-val">' + escapeHTML(uid) + '</span>'
            + '</div>'
            + '<button class="bot-off-copy-btn" onclick="copyUserId()">'
            + '<i class="far fa-copy"></i> ' + escapeHTML(copyBtn)
            + '</button>'
            + '</div>';
    });
}

function showBlockedScreen() {
    applyTheme();
    var loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) loadingScreen.classList.add('hide');
    var appContainer = document.getElementById('appContainer');
    if (appContainer) {
        appContainer.style.display = 'none';
        appContainer.classList.remove('show');
    }
    var overlay = document.getElementById('userBlockedOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function closeBlockedApp() {
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.close) {
        Telegram.WebApp.close();
    } else {
        window.close();
    }
}

function updateUserBallDisplay(balls) {
    userPremiumBall = parseInt(balls) || 0;
    var countEl = document.getElementById('userBallCount');
    var fillEl = document.getElementById('userBallProgressFill');
    var btnEl = document.getElementById('exchangeBallBtn');
    if (countEl) {
        countEl.textContent = userPremiumBall + ' / 10 ball';
    }
    if (fillEl) {
        var pct = Math.min(100, Math.round((userPremiumBall / 10) * 100));
        fillEl.style.width = pct + '%';
    }
    if (btnEl) {
        if (userPremiumBall >= 10) {
            btnEl.disabled = false;
            btnEl.style.opacity = '1';
            btnEl.style.cursor = 'pointer';
        } else {
            btnEl.disabled = true;
            btnEl.style.opacity = '0.5';
            btnEl.style.cursor = 'not-allowed';
        }
    }
}

function exchangeBallsForPremium() {
    if (userPremiumBall < 10) {
        var alertMsg = "1 oylik Premiumga almashtirish uchun sizda kamida 10 ball bo'lishi kerak. Hozirda sizda: " + userPremiumBall + " ball.";
        if (window.Telegram && Telegram.WebApp) {
            Telegram.WebApp.showAlert(alertMsg);
        } else {
            alert(alertMsg);
        }
        return;
    }
    var text = "Assalomu alaykum, men 10 ta ball yiqqan edim shuni 1 oylik Premiumga almashtirmoqchi edim.\n\n";
    if (currentUser) {
        text += "ID: " + currentUser.id;
        text += "\nIsm: " + (currentUser.first_name || '');
        if (currentUser.username) {
            text += "\nUsername: @" + currentUser.username;
        }
    }
    text += "\nBall: " + userPremiumBall + " ball";
    var adminUser = tgPremAdmin || 'zzqqaz';
    var url = "https://t.me/" + adminUser + "?text=" + encodeURIComponent(text);
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.openTelegramLink) {
        Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

window.showBlockedScreen = showBlockedScreen;
window.closeBlockedApp = closeBlockedApp;
window.updateUserBallDisplay = updateUserBallDisplay;
window.exchangeBallsForPremium = exchangeBallsForPremium;

function openBalanceTab() {
    var navItems = document.querySelectorAll('.nav-item');
    switchTab(5, navItems[3]);
}

var _prevPostUrl = '';
function updateTelegramPostPreview() {
    if (starsMode !== 'post') return;
    var url = document.getElementById('starsUsername').value.trim();
    if (url === _prevPostUrl) return;
    _prevPostUrl = url;
    var container = document.getElementById('telegramPostPreviewContainer');
    var target = document.getElementById('telegramPostPreview');
    if (!url) {
        container.style.display = 'none';
        target.innerHTML = '';
        return;
    }
    var match = url.match(/(?:t\.me|telegram\.me|telegram\.dog)\/([a-zA-Z0-9_]+)\/(\d+)/i);
    if (match) {
        var channel = match[1];
        var postId = match[2];
        container.style.display = 'block';
        target.innerHTML = '';
        var script = document.createElement('script');
        script.async = true;
        script.src = "https://telegram.org/js/telegram-widget.js?24";
        script.setAttribute('data-telegram-post', channel + '/' + postId);
        script.setAttribute('data-width', '100%');
        target.appendChild(script);
    } else {
        container.style.display = 'none';
        target.innerHTML = '';
    }
}

var _allBalanceTransactions = [];
var _balanceHistoryFilter = 'all';

function renderBalanceHistory() {
    var list = document.getElementById('balanceHistoryList');
    if (!list) return;
    list.innerHTML = '';
    var filtered = _allBalanceTransactions.filter(function(tx) { return tx.type === 'top_up' || tx.type === 'transfer_out' || tx.type === 'transfer_in'; });
    if (filtered.length > 0) {
        for (var i = 0; i < filtered.length; i++) {
            var tx = filtered[i];
            var item = document.createElement('div');
            item.className = 'transaction-item';
            var statusClass = tx.status === 'paid' ? 'status-paid' : tx.status === 'pending' ? 'status-pending' : 'status-canceled';
            var statusText = tx.status === 'paid' ? 'Bajarilgan' : tx.status === 'pending' ? 'Kutilmoqda' : 'Bekor qilingan';
            var typeIcon = '<i class="fas fa-plus-circle" style="color: #10b981;"></i>';
            var typeLabel = "Hisobni to'ldirish";
            if (tx.type === 'transfer_out') {
                typeIcon = '<i class="fas fa-arrow-circle-up" style="color: #ef4444;"></i>';
                typeLabel = "O'tkazma (Yuborildi)";
            } else if (tx.type === 'transfer_in') {
                typeIcon = '<i class="fas fa-arrow-circle-down" style="color: #10b981;"></i>';
                typeLabel = "O'tkazma (Qabul qilindi)";
            }
            item.innerHTML = '<div class="transaction-header"><div class="transaction-type">' + typeIcon + ' ' + typeLabel + '</div><div class="transaction-status ' + statusClass + '">' + statusText + '</div></div><div class="transaction-details">' + (tx.username ? 'Foydalanuvchi: ' + escapeHTML(tx.username) + '<br>' : '') + 'Miqdor: ' + escapeHTML(tx.amount) + '<br>Summa: ' + formatNumber(tx.price) + ' so\'m<br>Sana: ' + escapeHTML(tx.date) + '</div>';
            list.appendChild(item);
        }
    } else {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Tarix topilmadi</p></div>';
    }
}

function loadBalanceHistory() {
    if (!currentUser) return;
    var list = document.getElementById('balanceHistoryList');
    if (!list) return;
    list.innerHTML = skeletonHistory();
    apiCall('get_history', { user_id: currentUser.id }, function (result) {
        list.innerHTML = '';
        if (result && result.success && result.transactions && result.transactions.length > 0) {
            _allBalanceTransactions = result.transactions;
            renderBalanceHistory();
        } else {
            _allBalanceTransactions = [];
            list.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Tarix topilmadi</p></div>';
        }
    });
}

function createTopUpOrder() {
    var amount = parseInt(document.getElementById('topUpAmount').value);
    if (!amount || amount < 5000 || amount > 1000000) { tg.showAlert("Summa 5 000 - 1 000 000 so'm oralig'ida bo'lishi kerak!"); return; }
    showLoadingModal(t('order_creating'));
    apiCall('create_top_up_order', {
        buyer_id: currentUser.id,
        amount: amount
    }, function (result) {
        hideLoadingModal();
        if (result && result.success) {
            showPaymentModal(result.pay_url, "Balans to'ldirish - " + formatNumber(result.price) + " so'm\n\nTo'lov sahifasiga yo'naltirilmoqda...");
            document.getElementById('topUpAmount').value = '';
        } else {
            tg.showAlert(result.error || t('err_generic'));
        }
    });
}



function toggleTransferCard() {
    var card = document.getElementById('transferCard');
    var topUp = document.getElementById('topUpCard');
    var btn = document.getElementById('transferToggleBtn');
    if (!card) return;
    if (card.style.display === 'none') {
        card.style.display = 'block';
        if (topUp) topUp.style.display = 'none';
        if (btn) btn.innerHTML = 'Ortga';
        initTransferSwiper();
    } else {
        card.style.display = 'none';
        if (topUp) topUp.style.display = 'block';
        if (btn) btn.innerHTML = 'Transfer';
        resetTransferFields();
    }
}

function resetTransferFields() {
    document.getElementById('transferUserId').value = '';
    document.getElementById('transferAmount').value = '';
    document.getElementById('transferReceiverPanel').style.display = 'none';
    document.getElementById('transferCalcDetails').style.display = 'none';
    var avatarEl = document.getElementById('transferReceiverAvatar');
    if (avatarEl) {
        avatarEl.textContent = '';
        avatarEl.style.backgroundImage = 'none';
    }
    resetTransferSwiper();
}

var checkUserTimeout = null;
function onTransferUserIdChange() {
    var userId = document.getElementById('transferUserId').value.trim();
    var panel = document.getElementById('transferReceiverPanel');
    var nameEl = document.getElementById('transferReceiverName');
    var avatarEl = document.getElementById('transferReceiverAvatar');
    
    if (checkUserTimeout) clearTimeout(checkUserTimeout);
    
    if (!userId || userId.length < 3) {
        panel.style.display = 'none';
        return;
    }
    
    checkUserTimeout = setTimeout(function() {
        apiCall('check_user_id', { target_id: userId }, function(result) {
            if (result && result.success) {
                panel.style.display = 'flex';
                nameEl.textContent = 'Foydalanuvchi topildi (ID: ' + userId + ')';
            } else {
                panel.style.display = 'none';
            }
        });
    }, 150);
}

function onTransferAmountChange() {
    var amount = parseInt(document.getElementById('transferAmount').value);
    var details = document.getElementById('transferCalcDetails');
    var deductEl = document.getElementById('transferDeductVal');
    var receiveEl = document.getElementById('transferReceiveVal');
    var commEl = document.getElementById('transferCommVal');
    
    if (!amount || amount <= 0) {
        details.style.display = 'none';
        return;
    }
    
    var comm = Math.round(amount * 0.03);
    var total = amount + comm;
    
    details.style.display = 'block';
    deductEl.textContent = formatNumber(total);
    receiveEl.textContent = formatNumber(amount);
    commEl.textContent = formatNumber(comm);
}

var swiperState = {
    startX: 0,
    currentX: 0,
    isDragging: false
};

function initTransferSwiper() {
    var handle = document.getElementById('transferSwipeHandle');
    var track = handle.parentNode;
    if (!handle || !track) return;
    
    resetTransferSwiper();
    
    function getEventX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }
    
    function startDrag(e) {
        if (swiperState.isDragging) return;
        swiperState.isDragging = true;
        swiperState.startX = getEventX(e);
        handle.style.transition = 'none';
        document.getElementById('transferSwipeProgress').style.transition = 'none';
        
        document.addEventListener('mousemove', moveDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchmove', moveDrag, { passive: false });
        document.addEventListener('touchend', stopDrag);
    }
    
    function moveDrag(e) {
        if (!swiperState.isDragging) return;
        
        var x = getEventX(e);
        var diff = x - swiperState.startX;
        var maxDiff = track.offsetWidth - handle.offsetWidth - 4;
        
        if (diff < 0) diff = 0;
        if (diff > maxDiff) diff = maxDiff;
        
        handle.style.left = (diff + 2) + 'px';
        document.getElementById('transferSwipeProgress').style.width = (diff + 20) + 'px';
        
        var pct = diff / maxDiff;
        document.getElementById('transferSwipeText').style.opacity = 1 - pct * 1.5;
        
        swiperState.currentX = diff;
        
        if (e.cancelable) e.preventDefault();
    }
    
    function stopDrag() {
        if (!swiperState.isDragging) return;
        swiperState.isDragging = false;
        
        document.removeEventListener('mousemove', moveDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', moveDrag);
        document.removeEventListener('touchend', stopDrag);
        
        var maxDiff = track.offsetWidth - handle.offsetWidth - 4;
        
        if (swiperState.currentX >= maxDiff * 0.95) {
            handle.style.transition = 'left 0.1s ease-out';
            handle.style.left = (maxDiff + 2) + 'px';
            document.getElementById('transferSwipeProgress').style.width = '100%';
            executeFundTransfer();
        } else {
            resetTransferSwiper();
        }
    }
    
    handle.addEventListener('mousedown', startDrag);
    handle.addEventListener('touchstart', startDrag, { passive: true });
}

function resetTransferSwiper() {
    var handle = document.getElementById('transferSwipeHandle');
    var progress = document.getElementById('transferSwipeProgress');
    var txt = document.getElementById('transferSwipeText');
    if (!handle) return;
    
    handle.style.transition = 'left 0.2s ease-out';
    progress.style.transition = 'width 0.2s ease-out';
    
    handle.style.left = '2px';
    progress.style.width = '0px';
    txt.style.opacity = '1';
    
    swiperState.currentX = 0;
    swiperState.isDragging = false;
}

function executeFundTransfer() {
    var userId = document.getElementById('transferUserId').value.trim();
    var amount = parseInt(document.getElementById('transferAmount').value);
    var panel = document.getElementById('transferReceiverPanel');
    
    if (!userId) {
        tg.showAlert("Do'stingizning Telegram ID raqamini kiriting!");
        resetTransferSwiper();
        return;
    }
    if (!panel || panel.style.display === 'none') {
        tg.showAlert("Qabul qiluvchi topilmadi yoki botda ro'yxatdan o'tmagan!");
        resetTransferSwiper();
        return;
    }
    if (!amount || amount < 1000) {
        tg.showAlert("Minimal o'tkazma summasi 1 000 so'm!");
        resetTransferSwiper();
        return;
    }
    
    var comm = Math.round(amount * 0.03);
    var total = amount + comm;
    if (currentUser && currentUser.balance < total) {
        tg.showAlert("Balansingizda yetarli mablag' mavjud emas! Jami yechiladigan summa: " + formatNumber(total) + " so'm");
        resetTransferSwiper();
        return;
    }
    
    showLoadingModal("O'tkazma amalga oshirilmoqda...");
    
    apiCall('transfer_funds', {
        buyer_id: currentUser.id,
        target_id: userId,
        amount: amount
    }, function(result) {
        hideLoadingModal();
        if (result && result.success) {
            tg.showAlert("Mablag' muvaffaqiyatli o'tkazildi!");
            toggleTransferCard();
            loadStats();
            loadBalanceHistory();
        } else {
            tg.showAlert(result ? (result.error || "O'tkazmada xatolik yuz berdi!") : "O'tkazmada xatolik yuz berdi!");
            resetTransferSwiper();
        }
    });
}

var _balanceAnimId = null;
function initBalanceAnimation() {
    var canvas = document.getElementById('balanceEncryptCanvas');
    if (!canvas) return;
    
    if (_balanceAnimId) {
        cancelAnimationFrame(_balanceAnimId);
        _balanceAnimId = null;
    }
    
    var ctx = canvas.getContext('2d');
    canvas.width = 240;
    canvas.height = 32;

    var letters = "nmcxzaoumweuoszxcvnm";
    var spacing = 18;
    var offset = 0;
    var speed = 0.8;

    function getChar(index, isBinary) {
        var now = Date.now();
        if (isBinary) {
            var timeFactor = Math.floor(now / 150);
            return (Math.abs(index * 17 + timeFactor) % 2 === 0) ? '1' : '0';
        } else {
            var timeFactor = Math.floor(now / 100);
            var charIndex = Math.abs(index * 31 + timeFactor) % letters.length;
            return letters[charIndex];
        }
    }

    function animate() {
        var cvs = document.getElementById('balanceEncryptCanvas');
        if (!cvs) return;

        ctx.clearRect(0, 0, 240, 32);

        offset += speed;
        if (offset >= spacing) {
            offset -= spacing;
        }

        var minIndex = Math.floor((0 - offset) / spacing) - 1;
        var maxIndex = Math.ceil((240 - offset) / spacing) + 1;

        ctx.font = 'bold 15px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';

        for (var i = minIndex; i <= maxIndex; i++) {
            var x = i * spacing + offset;

            if (x < -10 || x > 250) continue;

            var isBinary = (x >= 120);
            var char = getChar(i, isBinary);
            var dist = Math.abs(x - 120);
            var opacity = Math.max(0, 1 - (dist / 110));

            if (opacity <= 0) continue;

            ctx.globalAlpha = opacity;

            if (x < 120) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
            } else {
                ctx.fillStyle = '#8AAC62';
            }

            ctx.fillText(char, x, 16);
        }

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#8AAC62';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('|', 120, 16);

        _balanceAnimId = requestAnimationFrame(animate);
    }

    animate();
}

function loadTopTicker() {
    apiCall('get_top', { period: 'monthly', limit: 40 }, function (result) {
        var items = [];
        if (result && result.success && result.users && result.users.length > 0) {
            for (var i = 0; i < result.users.length; i++) {
                items.push(result.users[i].first_name || 'Xaridor');
            }
        } else {
            items = ["Foydalanuvchi", "Mijoz", "Xaridor", "Foydalanuvchi", "Mijoz"];
        }
        
        var inner = document.getElementById('topTickerInner');
        if (!inner) return;
        
        function buildItems() {
            var html = '';
            for (var i = 0; i < items.length; i++) {
                html += '<span class="top-ticker-item">'
                    + '<span class="top-ticker-name">' + escapeHTML(truncateName(items[i], 15)) + '</span>'
                    + '</span>';
                if (i < items.length - 1) {
                    html += '<span class="top-ticker-sep">•</span>';
                }
            }
            return html;
        }
        
        var set = buildItems();
        inner.innerHTML = set + '<span class="top-ticker-sep" style="padding:0 16px;">•</span>' + set;
        
        requestAnimationFrame(function () {
            var totalW = inner.scrollWidth / 2;
            var speed = 40;
            var dur = Math.max(6, totalW / speed);
            
            var track = document.getElementById('topTickerTrack');
            if (!track) return;
            track.style.animation = 'none';
            track.style.transform = 'translateX(-50%)';
            
            void track.offsetWidth;
            track.style.animation = 'topTickerScroll ' + dur.toFixed(1) + 's linear infinite';
        });
    });
}

function initNavSwipe() {
    var container = document.querySelector('.nav-container');
    if (!container) return;
    
    function handleTouch(e) {
        var touch = e.touches[0];
        if (!touch) return;
        
        var element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (!element) return;
        
        var navItem = element.closest('.nav-item');
        if (navItem) {
            var navItems = Array.from(container.querySelectorAll('.nav-item'));
            var index = navItems.indexOf(navItem);
            
            if (index !== -1 && index !== activeTab) {
                if (getComputedStyle(navItem).display !== 'none') {
                    switchTab(index, navItem);
                    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
                        Telegram.WebApp.HapticFeedback.impactOccurred('light');
                    }
                }
            }
        }
    }
    
    container.addEventListener('touchstart', handleTouch, { passive: true });
    container.addEventListener('touchmove', handleTouch, { passive: true });
}

(function(){
 var D={
  get_price:{success:true,star_price:220,gift_star_price:240,game_enabled:true,fuelpuck_enabled:false,system_status:'on'},
  get_stats:{success:true,balance:150000,stars:1250,money:275000,savdo_soni:12,tgprem_price:45000,premium_ball:3},
  get_top:{success:true,users:[['Sardor',4850000],['Madina',3920000],['Jasur',3105000],['Dilnoza',2640000],['Bekzod',2210000],['Nigora',1890000],['Otabek',1540000],['Malika',1220000],['Sherzod',980000],['Zilola',760000]].map(function(a){return{first_name:a[0],total:a[1]}})},
  get_history:{success:true,transactions:[
   {type:'stars',status:'paid',username:'ismingiz',amount:'100 Stars',price:22000,date:'2026-10-24 18:42'},
   {type:'premium',status:'paid',username:'ismingiz',amount:'1 oy',price:45000,date:'2026-10-22 12:10'},
   {type:'stars',status:'paid',username:'do_st',amount:'500 Stars',price:110000,date:'2026-10-20 21:05'},
   {type:'gift',status:'paid',username:'ismingiz',amount:'Gift 50 Stars',price:12000,date:'2026-10-18 09:30'}]},
  get_tg_accounts:{success:true,accounts:[]},
  get_giveaways:{success:true,giveaways:[]}
 };
 window.apiCall=function(action,data,cb){
  var r=D[action];
  if(action==='create_stars_order'){window.__ordered=1;r={success:true,paid_via_balance:true,price:22000};}
  if(action==='get_stats'&&window.__ordered){r=JSON.parse(JSON.stringify(r));r.balance=128000;r.stars=1350;r.savdo_soni=13;}
  if(!r)r={success:false,error:'demo'};
  setTimeout(function(){cb(JSON.parse(JSON.stringify(r)))},action==='create_stars_order'?900:200);
 };
})();

init();
loadTicker();
initBalanceAnimation();
initNavSwipe();

function openQrScannerModal() {
    if (window.Telegram && Telegram.WebApp && typeof Telegram.WebApp.showScanQrPopup === 'function') {
        try {
            Telegram.WebApp.showScanQrPopup({ text: "Do'stingizning Telegram ID QR-kodini skanerlang" }, function(text) {
                if (text) {
                    processScannedQrData(text);
                    Telegram.WebApp.closeScanQrPopup();
                    return true;
                }
            });
            return;
        } catch(e) {}
    }
    var modal = document.getElementById('qrScannerModal');
    if (modal) modal.style.display = 'flex';
}

function closeQrScannerModal() {
    var modal = document.getElementById('qrScannerModal');
    if (modal) modal.style.display = 'none';
    stopWebCameraQrScan();
}

function processScannedQrData(text) {
    if (!text) return;
    var digits = text.match(/\d+/g);
    var scannedId = '';
    if (digits) {
        for (var i = 0; i < digits.length; i++) {
            if (digits[i].length >= 5) {
                scannedId = digits[i];
                break;
            }
        }
        if (!scannedId && digits.length > 0) scannedId = digits[0];
    }
    if (!scannedId) scannedId = text.trim();
    
    var input = document.getElementById('transferUserId');
    if (input) {
        input.value = scannedId;
        onTransferUserIdChange();
    }
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.HapticFeedback) {
        Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    closeQrScannerModal();
}

function handleQrFileSelect(input) {
    if (!input || !input.files || input.files.length === 0) return;
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
        var img = new Image();
        img.onload = function() {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            if (typeof jsQR !== 'undefined') {
                var code = jsQR(imageData.data, imageData.width, imageData.height);
                if (code && code.data) {
                    processScannedQrData(code.data);
                } else {
                    if (window.Telegram && Telegram.WebApp) Telegram.WebApp.showAlert("Rasmdan QR kod topilmadi!");
                    else alert("Rasmdan QR kod topilmadi!");
                }
            } else {
                if (window.Telegram && Telegram.WebApp) Telegram.WebApp.showAlert("QR skaner moduli yuklanmagan.");
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    input.value = '';
}

var _webCameraStream = null;
function startNativeOrWebQrScan() {
    var area = document.getElementById('webQrReaderArea');
    var video = document.getElementById('webQrVideo');
    if (!area || !video) return;
    area.style.display = 'block';
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function(stream) {
            _webCameraStream = stream;
            video.srcObject = stream;
            video.play();
            requestAnimationFrame(tickWebQrScan);
        }).catch(function(err) {
            alert("Kameraga ruxsat berilmadi yoki kamera topilmadi.");
        });
    }
}

function stopWebCameraQrScan() {
    if (_webCameraStream) {
        _webCameraStream.getTracks().forEach(function(track) { track.stop(); });
        _webCameraStream = null;
    }
    var area = document.getElementById('webQrReaderArea');
    if (area) area.style.display = 'none';
}

function tickWebQrScan() {
    var video = document.getElementById('webQrVideo');
    if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        var canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
            var code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code && code.data) {
                stopWebCameraQrScan();
                processScannedQrData(code.data);
                return;
            }
        }
    }
    if (_webCameraStream) {
        requestAnimationFrame(tickWebQrScan);
    }
}

function openMyQrModal() {
    var modal = document.getElementById('myQrModal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    var uObj = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : ((typeof userData !== 'undefined' && userData) ? userData : null);
    var userId = (uObj && uObj.id) ? uObj.id.toString() : ((window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id.toString() : '123456789');
    var disp = document.getElementById('myQrUserIdVal');
    if (disp) disp.textContent = userId;
    
    var container = document.getElementById('myQrCodeContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
        try {
            new QRCode(container, {
                text: userId,
                width: 180,
                height: 180,
                colorDark: "#1a1a1a",
                colorLight: "#ffffff"
            });
            var qrCanvas = container.querySelector('canvas');
            var qrImg = container.querySelector('img');
            if (qrCanvas) {
                qrCanvas.style.display = 'block';
                qrCanvas.style.margin = '0 auto';
            }
            if (qrImg) {
                qrImg.style.margin = '0 auto';
                if (!qrCanvas) {
                    qrImg.style.display = 'block';
                }
            }
            if (container.children.length > 0) return;
        } catch(e) {}
    }
    
    container.innerHTML = '<div style="padding:20px; color:var(--tg-hint); font-size:13px; text-align:center;"><i class="fas fa-spinner fa-spin" style="font-size:24px; color:var(--tg-btn); display:block; margin:0 auto 8px auto;"></i>Yuklanmoqda...</div>';
    
    var qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(userId);
    var img = new Image();
    img.alt = 'Telegram ID QR Code';
    img.style.width = '180px';
    img.style.height = '180px';
    img.style.borderRadius = '8px';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    
    img.onload = function() {
        container.innerHTML = '';
        container.appendChild(img);
    };
    
    img.onerror = function() {
        var fallbackImg = new Image();
        fallbackImg.alt = 'Telegram ID QR Code';
        fallbackImg.style.width = '180px';
        fallbackImg.style.height = '180px';
        fallbackImg.style.display = 'block';
        fallbackImg.style.margin = '0 auto';
        fallbackImg.onload = function() {
            container.innerHTML = '';
            container.appendChild(fallbackImg);
        };
        fallbackImg.onerror = function() {
            container.innerHTML = '<div style="padding:15px; color:#ff4d4d; font-size:13px; text-align:center;"><i class="fas fa-exclamation-circle" style="font-size:20px; display:block; margin:0 auto 6px auto;"></i>QR kod yuklanmadi</div>';
        };
        fallbackImg.src = 'https://quickchart.io/qr?size=300&text=' + encodeURIComponent(userId);
    };
    
    img.src = qrUrl;
}

function closeMyQrModal() {
    var modal = document.getElementById('myQrModal');
    if (modal) modal.style.display = 'none';
}

function copyMyTelegramId() {
    var uObj = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : ((typeof userData !== 'undefined' && userData) ? userData : null);
    var userId = (uObj && uObj.id) ? uObj.id.toString() : ((window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe && Telegram.WebApp.initDataUnsafe.user) ? Telegram.WebApp.initDataUnsafe.user.id.toString() : '');
    if (!userId) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(userId).then(function() {
            if (window.Telegram && Telegram.WebApp) Telegram.WebApp.showAlert("Telegram ID nusxalandi: " + userId);
            else alert("Nusxalandi: " + userId);
        });
    } else {
        var input = document.createElement('input');
        input.value = userId;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        if (window.Telegram && Telegram.WebApp) Telegram.WebApp.showAlert("Telegram ID nusxalandi: " + userId);
    }
}