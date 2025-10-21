
// Track if app is initialized
window.appInitialized = false;

// Improved session handling
async function checkAndRefreshSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Session check error:', error);
            return false;
        }
        
        if (session) {
            // Check if session is expired or about to expire
            const expiresAt = new Date(session.expires_at * 1000);
            const now = new Date();
            const timeUntilExpiry = expiresAt - now;
            
            if (timeUntilExpiry < 5 * 60 * 1000) { // 5 minutes
                console.log('🔄 Session expiring soon, refreshing...');
                const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
                
                if (refreshError) {
                    console.error('Session refresh error:', refreshError);
                    return false;
                }
                
                return !!newSession;
            }
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error checking session:', error);
        return false;
    }
}


// تحقق من أن الملف يحمل كـ JavaScript



console.log("✅ app.js loaded as module");

// تحقق من وجود مكتبة Supabase
if (typeof window.supabase === 'undefined') {
  console.error('Supabase library not loaded');
} else {
  console.log('Supabase library loaded');
}

// تحقق من وجود Chart.js
if (typeof Chart === 'undefined') {
  console.error('Chart.js not loaded');
} else {
  console.log('Chart.js loaded');
}

// كود Supabase الأساسي مع معالجة الأخطاء
let supabase;

try {
  const SUPABASE_URL = 'https://jazkprhtdtlixpdvpzbv.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_XCw9LBFvQLejpAnKxcRfHg_0DCd3PT0';
  
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase configuration missing');
  }
  
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  });
  console.log("🔑 Supabase client initialized with key:", SUPABASE_ANON_KEY);

  
  console.log('Supabase client created successfully');
  
} catch (error) {
  console.error('Error initializing Supabase:', error);
}

async function handleOAuthRedirect() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Session error:', error);
    return;
  }

  const appEl = document.querySelector('.app');
  const authEl = document.getElementById('loginModal');

  if (!appEl || !authEl) {
    console.warn('⚠️ Missing app or loginModal elements.');
    return;
  }

  const { session } = data;
  if (session) {
    console.log('✅ Logged in as', session.user?.email || session.user?.id);
    appEl.style.display = 'block';
    authEl.style.display = 'none';
  } else {
    console.log('❌ No session found, showing login');
    appEl.style.display = 'none';
    authEl.style.display = 'block';
  }
}

document.addEventListener('DOMContentLoaded', handleOAuthRedirect);



// Constants
const START_POINTS_RATED = 1500;
const START_POINTS_DC = 0;
const DELTA_RATED = 7;
const DELTA_DC_WIN = 1;
const DELTA_DC_LOSS = 1;
const DELTA_DC_LOSS_BELOW_15 = 0.5;
const DC_THRESHOLD = 15;
const defaultDecks = ["Branded","Ryzeal Mitsu","Mitsu Pure","Mitsu FS","Orcust","Maliss"];

// Global Variables
let pointsChart = null;
let trendChart = null;
let archivePointsChart = null;
let currentUser = null;
let currentSessionId = null;
let allSessions = {};

// Default settings
const defaultSettings = {
  bgOpacity: 1,
  cardOpacity: 1,
  theme: 'default',
  pointsFormula: 'rated',
  shareData: true,
  showDeckLists: true
};

// ==================== نظام المستخدمين مع Supabase ====================

async function getCurrentSessionUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Logout error:', error);
}

// ==================== نظام تسجيل الدخول (Discord) ====================

function initLoginSystem() {
  console.log('🔄 Initializing login system...');
  
  const discordLoginBtn = document.getElementById('discordLoginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (discordLoginBtn) {
    discordLoginBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('🎯 Discord button clicked!');
      handleDiscordLogin();
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

 async function handleDiscordLogin() {
  console.log('🎯 handleDiscordLogin called');
  
  try {
    const result = await signInWithDiscord();
    return result;
  } catch (error) {
    console.error('❌ Error in handleDiscordLogin:', error);
    showAlert('Login failed: ' + error.message, 'error');
    return null;
  }
}

async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    await logoutUser();
  }
}


async function signInWithDiscord() {
    console.log('🔄 Starting Discord OAuth...');
    
    try {
        // Get current origin dynamically
        const currentOrigin = window.location.origin;
        const redirectUrl = `${currentOrigin}/auth-callback.html`;
        
        console.log('🔗 Redirect URL:', redirectUrl);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: redirectUrl,
                scopes: 'identify email',
                queryParams: {
                    prompt: 'consent' // Force consent screen every time
                }
            }
        });
        
        if (error) {
            console.error('❌ Discord OAuth Error:', error);
            showAlert('OAuth Error: ' + error.message, 'error');
            return null;
        }
        
        console.log('✅ OAuth initiated successfully');
        
        // The user will be redirected to Discord, then back to auth-callback.html
        // which will then redirect them back to the main app
        
        return data;
        
    } catch (error) {
        console.error('❌ Unexpected error in signInWithDiscord:', error);
        showAlert('Unexpected error: ' + error.message, 'error');
        return null;
    }
}



// ==================== نظام إدارة الجلسات مع Supabase ====================

async function loadUserSessions(userId) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading sessions:', error);
      
      // معالجة خطأ المصادقة
      if (error.status === 401) {
        await handleAuthError(error);
        return {};
      }
      
      // معالجة أخطاء أخرى
      if (error.code === 'PGRST116') {
        console.log('No sessions found for user, returning empty object');
        return {};
      }
      
      showAlert('Error loading sessions: ' + error.message, 'error');
      return {};
    }
    
    const sessions = {};
    if (data && data.length > 0) {
      data.forEach(session => {
        sessions[session.id] = {
          id: session.id,
          name: session.name,
          createdAt: session.created_at,
          matches: session.matches || [],
          decks: session.decks || defaultDecks.slice(),
          pointsStart: session.points_start || START_POINTS_RATED,
          defaultDeck: session.default_deck || null,
          peakPoints: session.peak_points || session.points_start || START_POINTS_RATED
        };
      });
    }
    
    allSessions = sessions;
    return sessions;
    
  } catch (error) {
    console.error('Unexpected error in loadUserSessions:', error);
    showAlert('Unexpected error loading sessions', 'error');
    return {};
  }
}

async function saveUserSession(session, userId) {
  try {
    const sessionData = {
      user_id: userId,
      name: session.name,
      matches: session.matches,
      decks: session.decks,
      points_start: session.pointsStart,
      default_deck: session.defaultDeck,
      peak_points: session.peakPoints,
      updated_at: new Date().toISOString()
    };
    
    let result;
    
    if (session.id) {
      const { data, error } = await supabase
        .from('sessions')
        .update(sessionData)
        .eq('id', session.id)
        .select();
      
      if (error) {
        if (error.status === 401) {
          await handleAuthError(error);
          throw error;
        }
        throw error;
      }
      
      if (data && data[0]) {
        allSessions[session.id] = {
          ...session,
          ...data[0]
        };
        result = data[0];
      } else {
        throw new Error('No data returned after update');
      }
      
    } else {
      sessionData.created_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('sessions')
        .insert(sessionData)
        .select();
      
      if (error) {
        if (error.status === 401) {
          await handleAuthError(error);
          throw error;
        }
        throw error;
      }
      
      if (data && data[0]) {
        allSessions[data[0].id] = {
          ...session,
          ...data[0]
        };
        result = data[0];
      } else {
        throw new Error('No data returned after insert');
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Error saving session:', error);
    
    // إذا كان الخطأ غير متعلق بالمصادقة، عرض رسالة للمستخدم
    if (error.status !== 401) {
      showAlert('Error saving session: ' + error.message, 'error');
    }
    
    throw error;
  }
}

async function deleteUserSession(sessionId) {
  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) {
      if (error.status === 401) {
        await handleAuthError(error);
        throw error;
      }
      throw error;
    }
    
    delete allSessions[sessionId];
    
  } catch (error) {
    console.error('Error deleting session:', error);
    
    if (error.status !== 401) {
      showAlert('Error deleting session: ' + error.message, 'error');
    }
    
    throw error;
  }
}

async function renameUserSession(sessionId, newName) {
  try {
    const { error } = await supabase
      .from('sessions')
      .update({ 
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (error) {
      if (error.status === 401) {
        await handleAuthError(error);
        throw error;
      }
      throw error;
    }
    
    if (allSessions[sessionId]) {
      allSessions[sessionId].name = newName;
    }
    
  } catch (error) {
    console.error('Error renaming session:', error);
    
    if (error.status !== 401) {
      showAlert('Error renaming session: ' + error.message, 'error');
    }
    
    throw error;
  }
}

// دالة مساعدة لمعالجة أخطاء المصادقة
async function handleAuthError(error) {
  console.error('Authentication error:', error);
  
  // تسجيل الخروج
  await logoutUser();
  
  // عرض رسالة للمستخدم
  showAlert('Your session has expired. Please login again.', 'error');
  
  // إعادة التوجيه إلى صفحة تسجيل الدخول
  setTimeout(() => {
    const loginModal = document.getElementById('loginModal');
    const app = document.querySelector('.app');
    
    if (loginModal) loginModal.classList.add('active');
    if (app) app.style.display = 'none';
  }, 2000);
}

// دالة مساعدة لتسجيل الخروج
async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    
    // تنظيف البيانات المحلية
    currentUser = null;
    currentSessionId = null;
    allSessions = {};
    
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

// ==================== نظام قوائم المجموعات مع Supabase ====================

async function loadUserDeckLists(userId) {
  const { data, error } = await supabase
    .from('deck_lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading deck lists:', error);
    return [];
  }
  
  return data.map(deck => ({
    id: deck.id,
    name: deck.name,
    image: deck.image_url,
    description: deck.description,
    createdAt: deck.created_at,
    stats: deck.stats || {
      matches: 0,
      wins: 0,
      overallWR: '0%',
      wrGoing1st: '0%',
      wrGoing2nd: '0%'
    }
  }));
}

async function saveUserDeckList(deckList, userId) {
  const deckListData = {
    user_id: userId,
    name: deckList.name,
    image_url: deckList.image,
    description: deckList.description,
    stats: deckList.stats,
    updated_at: new Date().toISOString()
  };
  
  if (deckList.id) {
    const { data, error } = await supabase
      .from('deck_lists')
      .update(deckListData)
      .eq('id', deckList.id)
      .select();
    
    if (error) throw error;
    return data[0];
  } else {
    deckListData.created_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('deck_lists')
      .insert(deckListData)
      .select();
    
    if (error) throw error;
    return data[0];
  }
}

async function deleteUserDeckList(deckListId) {
  const { error } = await supabase
    .from('deck_lists')
    .delete()
    .eq('id', deckListId);
  
  if (error) throw error;
}

// ==================== نظام إدارة الجلسات ====================

async function populateSessionSelect() {
  if (!currentUser) return;
  
  await loadUserSessions(currentUser.id);
  
  const sessionSelect = document.getElementById('sessionSelect');
  if (!sessionSelect) return;
  
  sessionSelect.innerHTML = '';
  Object.keys(allSessions).forEach(id => {
    const session = allSessions[id];
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = session.name + ' (' + session.matches.length + ')';
    sessionSelect.appendChild(opt);
  });
  
  if (currentSessionId && allSessions[currentSessionId]) {
    sessionSelect.value = currentSessionId;
  } else if (sessionSelect.options.length) { 
    sessionSelect.selectedIndex = 0; 
    currentSessionId = sessionSelect.value;
  }
}

 function populateDecks() {
  if (!currentUser || !currentSessionId) return;
  
  const currentSession = allSessions[currentSessionId];
  if (!currentSession) return;
  
  const deckSelect = document.getElementById('deckSelect');
  const oppSelect = document.getElementById('oppSelect');
  
  if (!deckSelect || !oppSelect) return;
  
  deckSelect.innerHTML = ''; 
  oppSelect.innerHTML = '';
  
  const decks = currentSession.decks || defaultDecks;
  
  decks.forEach(d => {
    const o1 = document.createElement('option'); 
    o1.value = d; 
    o1.textContent = d; 
    deckSelect.appendChild(o1);
    
    const o2 = document.createElement('option'); 
    o2.value = d; 
    o2.textContent = d; 
    oppSelect.appendChild(o2);
  });
  
  if (currentSession.defaultDeck && decks.includes(currentSession.defaultDeck)) {
    deckSelect.value = currentSession.defaultDeck;
  }
}

async function renderMatches() {
  if (!currentUser || !currentSessionId) return;
  
  const currentSession = allSessions[currentSessionId];
  if (!currentSession) return;
  
  const matchesTbody = document.querySelector('#matchesTable tbody');
  const summaryLine = document.getElementById('summaryLine');
  
  if (!matchesTbody || !summaryLine) return;
  
  matchesTbody.innerHTML = '';
  
  recalcSession(currentSession);
  
  const settings = loadSettings();
  const isDCFormula = settings.pointsFormula === 'dc';
  
  currentSession.matches.forEach((m, index) => {
    const tr = document.createElement('tr');
    const resText = m.result === 'Win' ? '🏆 Win' : '❌ Loss';
    
    const formatPoints = (pts) => isDCFormula ? `${pts}k` : pts;
    
    tr.innerHTML = `
      <td>${escapeHtml(m.deck)}</td>
      <td>${escapeHtml(m.opp)}</td>
      <td>${resText}</td>
      <td>${escapeHtml(m.turn || '')}</td>
      <td>${formatPoints(m.pointsBefore)}</td>
      <td>${formatPoints(m.pointsAfter)}</td>
    `;
    matchesTbody.appendChild(tr);
  });
  
  const total = currentSession.matches.length;
  const wins = currentSession.matches.filter(x => x.result === 'Win').length;
  const pts = total ? currentSession.matches[total - 1].pointsAfter : currentSession.pointsStart;
  const wr = total ? Math.round(wins / total * 1000) / 10 + '%' : '0%';
  
  const formatPoints = (pts) => isDCFormula ? `${pts}k` : pts;
  
  summaryLine.textContent = `Matches: ${total} • Points: ${formatPoints(pts)} • Winrate: ${wr}`;
  
  await saveUserSession(currentSession, currentUser.id);
  
  updateCurrentAndPeakPoints();
  updateUserProfile();
  renderDeckPerf(currentSession);
  renderMatrix(currentSession);
  updateChart(currentSession);
  updateAdvancedAnalysis();
}

function recalcSession(session) {
  const settings = loadSettings();
  const formula = settings.pointsFormula;
  
  let pts = session.pointsStart;
  let peak = pts;

  for(let i = 0; i < session.matches.length; i++){
    session.matches[i].pointsBefore = pts;
    
    if (session.matches[i].customPointsAfter !== undefined) {
      pts = session.matches[i].customPointsAfter;
    } else {
      if(formula === 'rated') {
        pts = session.matches[i].result === 'Win' ? pts + DELTA_RATED : pts - DELTA_RATED;
      } else {
        if(session.matches[i].result === 'Win') {
          pts += DELTA_DC_WIN;
        } else {
          pts -= (pts < DC_THRESHOLD) ? DELTA_DC_LOSS_BELOW_15 : DELTA_DC_LOSS;
        }
      }
    }
    
    session.matches[i].pointsAfter = pts;
    
    if (pts > peak) {
      peak = pts;
    }
  }
  
  session.peakPoints = peak;
}

async function addMatch() {
  if (!currentUser || !currentSessionId) return;
  
  const currentSession = allSessions[currentSessionId];
  if (!currentSession) return;
  
  const deckSelect = document.getElementById('deckSelect');
  const oppSelect = document.getElementById('oppSelect');
  const resultSelect = document.getElementById('resultSelect');
  const turnOrderSelect = document.getElementById('turnOrder');
  const ptsAfterOverride = document.getElementById('ptsAfterOverride');
  
  if (!deckSelect || !oppSelect || !resultSelect) return;
  
  const deck = deckSelect.value;
  const opp = oppSelect.value;
  const result = resultSelect.value;
  const turn = turnOrderSelect ? turnOrderSelect.value || '' : '';
  const ptsAfterOverrideValue = ptsAfterOverride ? ptsAfterOverride.value.trim() : '';
  
  const last = currentSession.matches.length ? 
    currentSession.matches[currentSession.matches.length - 1].pointsAfter : 
    currentSession.pointsStart;
  
  const settings = loadSettings();
  let after;
  let customPointsAfter = undefined;
  
  if (ptsAfterOverrideValue) {
    if (settings.pointsFormula === 'rated') {
      after = parseInt(ptsAfterOverrideValue);
    } else {
      after = parseFloat(ptsAfterOverrideValue.replace('k', ''));
    }
    customPointsAfter = after;
  } else {
    if(settings.pointsFormula === 'rated') {
      after = result === 'Win' ? last + DELTA_RATED : last - DELTA_RATED;
    } else {
      if(result === 'Win') {
        after = last + DELTA_DC_WIN;
      } else {
        after = last - ((last < DC_THRESHOLD) ? DELTA_DC_LOSS_BELOW_15 : DELTA_DC_LOSS);
      }
    }
  }
  
  const matchData = { 
    deck, 
    opp, 
    result, 
    turn, 
    pointsBefore: last, 
    pointsAfter: after, 
    createdAt: new Date().toISOString() 
  };
  
  if (customPointsAfter !== undefined) {
    matchData.customPointsAfter = customPointsAfter;
  }
  
  currentSession.matches.push(matchData);
  
  await saveUserSession(currentSession, currentUser.id);
  await renderMatches();
  
  if (ptsAfterOverride) {
    ptsAfterOverride.value = '';
  }
  
  checkConsecutiveLosses(currentSession);
}

async function createSession(name) {
  if (!currentUser) return;
  
  const settings = loadSettings();
  const startPoints = settings.pointsFormula === 'rated' ? START_POINTS_RATED : START_POINTS_DC;
  
  const newSession = {
    name: name || ('Session ' + new Date().toLocaleString()),
    matches: [],
    decks: defaultDecks.slice(),
    pointsStart: startPoints,
    peakPoints: startPoints
  };
  
  const savedSession = await saveUserSession(newSession, currentUser.id);
  currentSessionId = savedSession.id;
  
  await renderAll();
  return savedSession.id;
}

// ==================== الإحصائيات والرسوم البيانية ====================

function updateChart(session) {
  const pointsChartCanvas = document.getElementById('pointsChart');
  if (!pointsChartCanvas) return;
  
  const ctx = pointsChartCanvas.getContext('2d');
  
  if(pointsChart) {
    pointsChart.destroy();
    pointsChart = null;
  }
  
  if(session.matches.length > 0) {
    const labels = session.matches.map((_, i) => i + 1);
    const data = session.matches.map(m => m.pointsAfter);
    
    pointsChart = new Chart(ctx, {
      type: 'line',
      data: { 
        labels, 
        datasets: [
          { 
            label: 'Points', 
            data, 
            tension: 0.28, 
            borderColor: 'rgba(124,92,255,0.95)', 
            backgroundColor: 'rgba(124,92,255,0.08)', 
            fill: true, 
            pointRadius: 3,
            borderWidth: 2
          }
        ] 
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            display: false 
          } 
        }, 
        scales: {
          x: {
            title: { 
              display: true, 
              text: 'Match #',
              color: 'var(--muted)'
            },
            grid: {
              color: 'rgba(255,255,255,0.05)'
            },
            ticks: {
              color: 'var(--muted)'
            }
          }, 
          y: {
            title: { 
              display: true, 
              text: 'Points',
              color: 'var(--muted)'
            },
            grid: {
              color: 'rgba(255,255,255,0.05)'
            },
            ticks: {
              color: 'var(--muted)'
            }
          }
        },
        animation: {
          duration: 300,
          easing: 'easeOutQuart'
        }
      }
    });
  } else {
    ctx.clearRect(0, 0, pointsChartCanvas.width, pointsChartCanvas.height);
    ctx.fillStyle = 'var(--muted)';
    ctx.textAlign = 'center';
    ctx.font = '14px Inter';
    ctx.fillText('No data available', pointsChartCanvas.width / 2, pointsChartCanvas.height / 2);
  }
}

function renderMatrix(session) {
  const matrixContainer = document.getElementById('matrixContainer');
  if (!matrixContainer) return;
  
  matrixContainer.innerHTML = '';
  const decks = session.decks || defaultDecks;
  
  const matrix = {};
  decks.forEach(r => { 
    matrix[r] = {}; 
    decks.forEach(c => matrix[r][c] = {w:0, l:0}); 
  });
  
  session.matches.forEach(m => {
    if(!matrix[m.deck]) matrix[m.deck] = {};
    if(!matrix[m.deck][m.opp]) matrix[m.deck][m.opp] = {w:0, l:0};
    
    if(m.result === 'Win') matrix[m.deck][m.opp].w++;
    else matrix[m.deck][m.opp].l++;
  });
  
  const tbl = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  
  decks.forEach(d => { 
    const th = document.createElement('th'); 
    th.textContent = d; 
    headRow.appendChild(th); 
  });
  
  thead.appendChild(headRow);
  tbl.appendChild(thead);

  const tbody = document.createElement('tbody');
  decks.forEach(r => {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); 
    th.style.textAlign = 'left'; 
    th.style.paddingLeft = '8px'; 
    th.textContent = r; 
    tr.appendChild(th);
    
    decks.forEach(c => {
      const td = document.createElement('td');
      const stat = (matrix[r] && matrix[r][c]) ? matrix[r][c] : {w:0, l:0};
      const total = stat.w + stat.l;
      
      if(total === 0){
        td.innerHTML = `<div class="cell" style="background:${hexWithOpacity('#101418',0.9)};color:var(--muted)">—</div>`;
      } else {
        const pct = Math.round((stat.w / total) * 1000) / 10;
        let bgColor = '#999';
        
        if(pct >= 70) bgColor = hexWithOpacity('#23c46b', 0.94);
        else if(pct >= 40) bgColor = hexWithOpacity('#f0b429', 0.92);
        else bgColor = hexWithOpacity('#ff6b6b', 0.92);
        
        td.innerHTML = `
          <div class="cell" style="background:${bgColor};color:#021014">
            <div class="pct">${pct}%</div>
            <div class="wl">${stat.w} - ${stat.l}</div>
          </div>
        `;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  
  tbl.appendChild(tbody);
  matrixContainer.appendChild(tbl);
}

function renderDeckPerf(session) {
  const deckPerfTableBody = document.querySelector('#deckPerfTable tbody');
  if (!deckPerfTableBody) return;
  
  deckPerfTableBody.innerHTML = '';
  const decks = session.decks || defaultDecks;
  
  decks.forEach(d => {
    const matches = session.matches.filter(m => m.deck === d);
    const wins = matches.filter(m => m.result === 'Win').length;
    
    const matches1 = matches.filter(m => m.turn === '1st');
    const wins1 = matches1.filter(m => m.result === 'Win').length;
    const matches2 = matches.filter(m => m.turn === '2nd');
    const wins2 = matches2.filter(m => m.result === 'Win').length;
    
    const wr = matches.length ? (Math.round(wins / matches.length * 1000) / 10 + '%') : '-';
    const wr1 = matches1.length ? (Math.round(wins1 / matches1.length * 1000) / 10 + '%') : '-';
    const wr2 = matches2.length ? (Math.round(wins2 / matches2.length * 1000) / 10 + '%') : '-';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(d)}</td>
      <td>${matches.length}</td>
      <td>${wins}</td>
      <td>${wr}</td>
      <td>${wr1}</td>
      <td>${wr2}</td>
    `;
    deckPerfTableBody.appendChild(tr);
  });
}

// ==================== نظام التنبؤات ====================

function updatePredictionDecks() {
  if (!currentUser || !currentSessionId) return;
  
  const currentSession = allSessions[currentSessionId];
  const decks = currentSession.decks || defaultDecks;
  
  const predDeckSelect = document.getElementById('predDeckSelect');
  const predOppSelect = document.getElementById('predOppSelect');
  
  if (!predDeckSelect || !predOppSelect) return;
  
  predDeckSelect.innerHTML = '';
  predOppSelect.innerHTML = '';
  
  decks.forEach(d => {
    const o1 = document.createElement('option'); 
    o1.value = d; 
    o1.textContent = d; 
    predDeckSelect.appendChild(o1);
    
    const o2 = document.createElement('option'); 
    o2.value = d; 
    o2.textContent = d; 
    predOppSelect.appendChild(o2);
  });
  
  updateRecommendedDecks(currentSession);
}

function predictMatch() {
  if (!currentUser || !currentSessionId) {
    alert('Please select a session first');
    return;
  }
  
  const predDeckSelect = document.getElementById('predDeckSelect');
  const predOppSelect = document.getElementById('predOppSelect');
  const predTurnOrder = document.getElementById('predTurnOrder');
  
  if (!predDeckSelect || !predOppSelect) return;
  
  const yourDeck = predDeckSelect.value;
  const oppDeck = predOppSelect.value;
  const turnOrder = predTurnOrder ? predTurnOrder.value : '';
  
  if (!yourDeck || !oppDeck) {
    alert('Please select both decks');
    return;
  }
  
  const currentSession = allSessions[currentSessionId];
  const prediction = calculatePrediction(currentSession, yourDeck, oppDeck, turnOrder);
  
  const winProbability = document.getElementById('winProbability');
  const confidenceFill = document.getElementById('confidenceFill');
  const confidenceValue = document.getElementById('confidenceValue');
  const overallWR = document.getElementById('overallWR');
  const turnWR = document.getElementById('turnWR');
  const matchupWR = document.getElementById('matchupWR');
  const recentWR = document.getElementById('recentWR');
  const predictionInsight = document.getElementById('predictionInsight');
  const predictionResult = document.getElementById('predictionResult');
  
  if (!winProbability || !predictionResult) return;
  
  winProbability.textContent = `${prediction.winProbability}%`;
  
  if (confidenceFill) confidenceFill.style.width = `${prediction.confidence}%`;
  if (confidenceValue) confidenceValue.textContent = `${prediction.confidence}% Confidence`;
  if (overallWR) overallWR.textContent = `${prediction.overallWR}%`;
  if (turnWR) turnWR.textContent = `${prediction.turnWR}%`;
  if (matchupWR) matchupWR.textContent = `${prediction.matchupWR}%`;
  if (recentWR) recentWR.textContent = `${prediction.recentWR}%`;
  if (predictionInsight) predictionInsight.textContent = prediction.insight;
  
  predictionResult.style.display = 'block';
}

function calculatePrediction(session, yourDeck, oppDeck, turnOrder) {
  const matches = session.matches;
  
  const overallMatches = matches.filter(m => m.deck === yourDeck);
  const overallWins = overallMatches.filter(m => m.result === 'Win').length;
  const overallWR = overallMatches.length > 0 ? Math.round(overallWins / overallMatches.length * 100) : 50;
  
  const turnMatches = matches.filter(m => m.deck === yourDeck && m.turn === turnOrder);
  const turnWins = turnMatches.filter(m => m.result === 'Win').length;
  const turnWR = turnMatches.length > 0 ? Math.round(turnWins / turnMatches.length * 100) : 50;
  
  const matchupMatches = matches.filter(m => m.deck === yourDeck && m.opp === oppDeck);
  const matchupWins = matchupMatches.filter(m => m.result === 'Win').length;
  const matchupWR = matchupMatches.length > 0 ? Math.round(matchupWins / matchupMatches.length * 100) : 50;
  
  const recentMatches = matches.filter(m => m.deck === yourDeck).slice(-10);
  const recentWins = recentMatches.filter(m => m.result === 'Win').length;
  const recentWR = recentMatches.length > 0 ? Math.round(recentWins / recentMatches.length * 100) : 50;
  
  const winProbability = Math.round(
    (overallWR * 0.3) + (turnWR * 0.2) + (matchupWR * 0.3) + (recentWR * 0.2)
  );
  
  let confidence = 0;
  if (overallMatches.length >= 5) confidence += 30;
  if (turnMatches.length >= 3) confidence += 20;
  if (matchupMatches.length >= 2) confidence += 30;
  if (recentMatches.length >= 3) confidence += 20;
  
  let insight = "Based on your historical performance, ";
  if (winProbability >= 70) {
    insight += "you have a strong advantage in this matchup. Consider playing aggressively.";
  } else if (winProbability >= 55) {
    insight += "you have a slight advantage. Focus on your game plan and avoid risky plays.";
  } else if (winProbability >= 45) {
    insight += "this is a fairly even matchup. The outcome will likely depend on skill and luck.";
  } else {
    insight += "you're at a disadvantage. Consider a different deck or focus on countering their strategy.";
  }
  
  if (turnOrder === '1st' && turnWR > 55) {
    insight += " Your performance going first is particularly strong.";
  } else if (turnOrder === '2nd' && turnWR > 55) {
    insight += " Your performance going second is particularly strong.";
  }
  
  return {
    winProbability,
    confidence,
    overallWR,
    turnWR,
    matchupWR,
    recentWR,
    insight
  };
}

function updateRecommendedDecks(session) {
  const recommendedDecks = document.getElementById('recommendedDecks');
  if (!recommendedDecks) return;
  
  const matches = session.matches;
  const decks = session.decks || defaultDecks;
  
  const oppDecks = {};
  matches.forEach(m => {
    oppDecks[m.opp] = (oppDecks[m.opp] || 0) + 1;
  });
  
  const deckScores = [];
  decks.forEach(deck => {
    let score = 0;
    let confidence = 0;
    
    Object.keys(oppDecks).forEach(oppDeck => {
      const matchupMatches = matches.filter(m => m.deck === deck && m.opp === oppDeck);
      if (matchupMatches.length > 0) {
        const wins = matchupMatches.filter(m => m.result === 'Win').length;
        const wr = wins / matchupMatches.length;
        
        score += wr * oppDecks[oppDeck];
        confidence += matchupMatches.length;
      }
    });
    
    const deckMatches = matches.filter(m => m.deck === deck);
    const deckWins = deckMatches.filter(m => m.result === 'Win').length;
    const overallWR = deckMatches.length > 0 ? (deckWins / deckMatches.length) * 100 : 50;
    
    const metaScore = Math.round(score * 10 + overallWR);
    const predWR = Math.min(85, Math.max(15, Math.round(overallWR)));
    
    deckScores.push({
      deck,
      predWR,
      confidence: Math.min(100, Math.round(confidence * 5)),
      metaScore
    });
  });
  
  deckScores.sort((a, b) => b.metaScore - a.metaScore);
  
  recommendedDecks.innerHTML = '';
  deckScores.slice(0, 5).forEach(d => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(d.deck)}</td>
      <td>${d.predWR}%</td>
      <td>${d.confidence}%</td>
      <td>${d.metaScore}</td>
    `;
    recommendedDecks.appendChild(tr);
  });
}

// ==================== نظام المقارنة ====================

function updateComparisonDecks() {
  if (!currentUser || !currentSessionId) return;
  
  const currentSession = allSessions[currentSessionId];
  const decks = currentSession.decks || defaultDecks;
  
  const compareDeck1 = document.getElementById('compareDeck1');
  const compareDeck2 = document.getElementById('compareDeck2');
  
  if (!compareDeck1 || !compareDeck2) return;
  
  compareDeck1.innerHTML = '';
  compareDeck2.innerHTML = '';
  
  decks.forEach(d => {
    const o1 = document.createElement('option'); 
    o1.value = d; 
    o1.textContent = d; 
    compareDeck1.appendChild(o1);
    
    const o2 = document.createElement('option'); 
    o2.value = d; 
    o2.textContent = d; 
    compareDeck2.appendChild(o2);
  });
}

function compareDecks() {
  const compareDeck1 = document.getElementById('compareDeck1');
  const compareDeck2 = document.getElementById('compareDeck2');
  
  if (!compareDeck1 || !compareDeck2) return;
  
  const deck1 = compareDeck1.value;
  const deck2 = compareDeck2.value;
  
  if (!deck1 || !deck2) {
    alert('Please select two decks to compare');
    return;
  }
  
  if (deck1 === deck2) {
    alert('Please select two different decks');
    return;
  }
  
  const currentSession = allSessions[currentSessionId];
  const deck1Stats = calculateDeckStats(currentSession, deck1);
  const deck2Stats = calculateDeckStats(currentSession, deck2);
  
  const deck1Name = document.getElementById('deck1Name');
  const deck2Name = document.getElementById('deck2Name');
  const deck1WR = document.getElementById('deck1WR');
  const deck2WR = document.getElementById('deck2WR');
  const deck1Matches = document.getElementById('deck1Matches');
  const deck2Matches = document.getElementById('deck2Matches');
  const deck1Streak = document.getElementById('deck1Streak');
  const deck2Streak = document.getElementById('deck2Streak');
  const deck1Turn1WR = document.getElementById('deck1Turn1WR');
  const deck1Turn2WR = document.getElementById('deck1Turn2WR');
  const deck2Turn1WR = document.getElementById('deck2Turn1WR');
  const deck2Turn2WR = document.getElementById('deck2Turn2WR');
  const h2hAnalysis = document.getElementById('h2hAnalysis');
  const comparisonResult = document.getElementById('comparisonResult');
  
  if (!deck1Name || !comparisonResult) return;
  
  deck1Name.textContent = deck1;
  deck2Name.textContent = deck2;
  
  if (deck1WR) deck1WR.textContent = deck1Stats.winRate + '%';
  if (deck2WR) deck2WR.textContent = deck2Stats.winRate + '%';
  if (deck1Matches) deck1Matches.textContent = deck1Stats.totalMatches;
  if (deck2Matches) deck2Matches.textContent = deck2Stats.totalMatches;
  if (deck1Streak) deck1Streak.textContent = deck1Stats.bestStreak;
  if (deck2Streak) deck2Streak.textContent = deck2Stats.bestStreak;
  if (deck1Turn1WR) deck1Turn1WR.textContent = deck1Stats.turn1WR + '%';
  if (deck1Turn2WR) deck1Turn2WR.textContent = deck1Stats.turn2WR + '%';
  if (deck2Turn1WR) deck2Turn1WR.textContent = deck2Stats.turn1WR + '%';
  if (deck2Turn2WR) deck2Turn2WR.textContent = deck2Stats.turn2WR + '%';
  
  let analysis = '';
  
  if (deck1Stats.winRate > deck2Stats.winRate) {
    analysis += `<strong>${deck1}</strong> has a higher overall win rate (${deck1Stats.winRate}% vs ${deck2Stats.winRate}%). `;
  } else if (deck2Stats.winRate > deck1Stats.winRate) {
    analysis += `<strong>${deck2}</strong> has a higher overall win rate (${deck2Stats.winRate}% vs ${deck1Stats.winRate}%). `;
  } else {
    analysis += `Both decks have the same overall win rate (${deck1Stats.winRate}%). `;
  }
  
  if (deck1Stats.turn1WR > deck2Stats.turn1WR) {
    analysis += `<strong>${deck1}</strong> performs better when going first. `;
  } else if (deck2Stats.turn1WR > deck1Stats.turn1WR) {
    analysis += `<strong>${deck2}</strong> performs better when going first. `;
  }
  
  if (deck1Stats.turn2WR > deck2Stats.turn2WR) {
    analysis += `<strong>${deck1}</strong> performs better when going second. `;
  } else if (deck2Stats.turn2WR > deck1Stats.turn2WR) {
    analysis += `<strong>${deck2}</strong> performs better when going second. `;
  }
  
  if (deck1Stats.bestStreak > deck2Stats.bestStreak) {
    analysis += `<strong>${deck1}</strong> has a longer win streak (${deck1Stats.bestStreak} vs ${deck2Stats.bestStreak}). `;
  } else if (deck2Stats.bestStreak > deck1Stats.bestStreak) {
    analysis += `<strong>${deck2}</strong> has a longer win streak (${deck2Stats.bestStreak} vs ${deck1Stats.bestStreak}). `;
  }
  
  if (deck1Stats.totalMatches > deck2Stats.totalMatches) {
    analysis += `You have more experience with <strong>${deck1}</strong> (${deck1Stats.totalMatches} vs ${deck2Stats.totalMatches} matches).`;
  } else if (deck2Stats.totalMatches > deck1Stats.totalMatches) {
    analysis += `You have more experience with <strong>${deck2}</strong> (${deck2Stats.totalMatches} vs ${deck1Stats.totalMatches} matches).`;
  }
  
  if (h2hAnalysis) h2hAnalysis.innerHTML = analysis;
  comparisonResult.style.display = 'block';
}

function calculateDeckStats(session, deck) {
  const matches = session.matches.filter(m => m.deck === deck);
  const wins = matches.filter(m => m.result === 'Win').length;
  const totalMatches = matches.length;
  const winRate = totalMatches > 0 ? Math.round(wins / totalMatches * 100) : 0;
  
  let currentStreak = 0;
  let bestStreak = 0;
  matches.forEach(match => {
    if (match.result === 'Win') {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  });
  
  const turn1Matches = matches.filter(m => m.turn === '1st');
  const turn1Wins = turn1Matches.filter(m => m.result === 'Win').length;
  const turn1WR = turn1Matches.length > 0 ? Math.round(turn1Wins / turn1Matches.length * 100) : 0;
  
  const turn2Matches = matches.filter(m => m.turn === '2nd');
  const turn2Wins = turn2Matches.filter(m => m.result === 'Win').length;
  const turn2WR = turn2Matches.length > 0 ? Math.round(turn2Wins / turn2Matches.length * 100) : 0;
  
  return {
    winRate,
    totalMatches,
    bestStreak,
    turn1WR,
    turn2WR
  };
}

// ==================== التحليل المتقدم ====================

function updateAdvancedAnalysis() {
  if (!currentUser || !currentSessionId) return;
  
  const currentSession = allSessions[currentSessionId];
  const matches = currentSession.matches;
  
  if (matches.length === 0) {
    const strategicInsights = document.getElementById('strategicInsights');
    const avgWinRate = document.getElementById('avgWinRate');
    const consistencyScore = document.getElementById('consistencyScore');
    const improvementRate = document.getElementById('improvementRate');
    const metaAdaptation = document.getElementById('metaAdaptation');
    
    if (strategicInsights) strategicInsights.innerHTML = '<p>Not enough data for advanced analysis. Play more matches to unlock insights.</p>';
    if (avgWinRate) avgWinRate.textContent = '0%';
    if (consistencyScore) consistencyScore.textContent = '0';
    if (improvementRate) improvementRate.textContent = '0%';
    if (metaAdaptation) metaAdaptation.textContent = '0%';
    return;
  }
  
  const wins = matches.filter(m => m.result === 'Win').length;
  const total = matches.length;
  const avgWinRateValue = Math.round(wins / total * 100);
  
  const firstHalf = matches.slice(0, Math.floor(total / 2));
  const secondHalf = matches.slice(Math.floor(total / 2));
  
  const firstHalfWins = firstHalf.filter(m => m.result === 'Win').length;
  const secondHalfWins = secondHalf.filter(m => m.result === 'Win').length;
  
  const firstHalfWR = firstHalf.length > 0 ? Math.round(firstHalfWins / firstHalf.length * 100) : 0;
  const secondHalfWR = secondHalf.length > 0 ? Math.round(secondHalfWins / secondHalf.length * 100) : 0;
  
  const improvementRateValue = secondHalfWR - firstHalfWR;
  
  const winRatesByDeck = [];
  const decks = currentSession.decks || defaultDecks;
  decks.forEach(deck => {
    const deckMatches = matches.filter(m => m.deck === deck);
    if (deckMatches.length > 0) {
      const deckWins = deckMatches.filter(m => m.result === 'Win').length;
      const deckWR = Math.round(deckWins / deckMatches.length * 100);
      winRatesByDeck.push(deckWR);
    }
  });
  
  const avgDeckWR = winRatesByDeck.length > 0 ? winRatesByDeck.reduce((a, b) => a + b, 0) / winRatesByDeck.length : 0;
  const variance = winRatesByDeck.length > 0 ? winRatesByDeck.reduce((a, b) => a + Math.pow(b - avgDeckWR, 2), 0) / winRatesByDeck.length : 0;
  const consistencyScoreValue = Math.max(0, 100 - Math.round(Math.sqrt(variance) * 2));
  
  const recentMatches = matches.slice(-10);
  const recentWins = recentMatches.filter(m => m.result === 'Win').length;
  const recentWR = recentMatches.length > 0 ? Math.round(recentWins / recentMatches.length * 100) : 0;
  const metaAdaptationValue = Math.min(100, Math.max(0, recentWR + 20));
  
  const avgWinRate = document.getElementById('avgWinRate');
  const consistencyScore = document.getElementById('consistencyScore');
  const improvementRate = document.getElementById('improvementRate');
  const metaAdaptation = document.getElementById('metaAdaptation');
  
  if (avgWinRate) avgWinRate.textContent = `${avgWinRateValue}%`;
  if (consistencyScore) consistencyScore.textContent = consistencyScoreValue;
  if (improvementRate) improvementRate.textContent = `${improvementRateValue > 0 ? '+' : ''}${improvementRateValue}%`;
  if (metaAdaptation) metaAdaptation.textContent = `${metaAdaptationValue}%`;
  
  updateTimeAnalysis(matches);
  updateSessionAnalysis(matches);
  updateStrategicInsights(matches, improvementRateValue, consistencyScoreValue);
  updateTrendChart(currentSession);
}

function updateTimeAnalysis(matches) {
  const timeAnalysis = document.getElementById('timeAnalysis');
  if (!timeAnalysis) return;
  
  timeAnalysis.innerHTML = '';
  const timePeriods = [
    { name: 'Morning', start: 6, end: 12 },
    { name: 'Afternoon', start: 12, end: 18 },
    { name: 'Evening', start: 18, end: 24 },
    { name: 'Night', start: 0, end: 6 }
  ];
  
  timePeriods.forEach(period => {
    const periodMatches = matches.filter(m => {
      const hour = new Date(m.createdAt).getHours();
      return (hour >= period.start && hour < period.end) || 
             (period.start > period.end && (hour >= period.start || hour < period.end));
    });
    
    const periodWins = periodMatches.filter(m => m.result === 'Win').length;
    const periodWR = periodMatches.length > 0 ? Math.round(periodWins / periodMatches.length * 100) : 0;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${period.name}</td>
      <td>${periodMatches.length}</td>
      <td>${periodWR}%</td>
    `;
    timeAnalysis.appendChild(tr);
  });
}

function updateSessionAnalysis(matches) {
  const sessionAnalysis = document.getElementById('sessionAnalysis');
  if (!sessionAnalysis) return;
  
  sessionAnalysis.innerHTML = '';
  const sessionLengths = [
    { range: '1-5', min: 1, max: 5 },
    { range: '6-10', min: 6, max: 10 },
    { range: '11-15', min: 11, max: 15 },
    { range: '16+', min: 16, max: 1000 }
  ];
  
  // هذا مثال مبسط - في التطبيق الحقيقي ستحتاج لتتبع طول الجلسات
  sessionLengths.forEach(session => {
    const frequency = Math.floor(Math.random() * 10) + 1;
    const winRate = Math.floor(Math.random() * 40) + 30;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${session.range}</td>
      <td>${winRate}%</td>
      <td>${frequency}</td>
    `;
    sessionAnalysis.appendChild(tr);
  });
}

function updateStrategicInsights(matches, improvementRateValue, consistencyScoreValue) {
  const strategicInsights = document.getElementById('strategicInsights');
  if (!strategicInsights) return;
  
  let insights = '';
  
  if (improvementRateValue > 5) {
    insights += `<p>📈 <strong>You're improving!</strong> Your win rate has increased by ${improvementRateValue}% in recent matches. Keep up the good work!</p>`;
  } else if (improvementRateValue < -5) {
    insights += `<p>📉 <strong>Your performance has declined</strong> by ${Math.abs(improvementRateValue)}%. Consider reviewing your recent matches to identify areas for improvement.</p>`;
  }
  
  if (consistencyScoreValue > 80) {
    insights += `<p>🎯 <strong>You're very consistent!</strong> Your performance doesn't vary much between different decks.</p>`;
  } else if (consistencyScoreValue < 60) {
    insights += `<p>🔄 <strong>Your performance varies significantly</strong> between different decks. Consider focusing on your best-performing decks.</p>`;
  }
  
  let bestTime = '';
  let bestWR = 0;
  const timePeriods = [
    { name: 'Morning', start: 6, end: 12 },
    { name: 'Afternoon', start: 12, end: 18 },
    { name: 'Evening', start: 18, end: 24 },
    { name: 'Night', start: 0, end: 6 }
  ];
  
  timePeriods.forEach(period => {
    const periodMatches = matches.filter(m => {
      const hour = new Date(m.createdAt).getHours();
      return (hour >= period.start && hour < period.end) || 
             (period.start > period.end && (hour >= period.start || hour < period.end));
    });
    
    if (periodMatches.length > 0) {
      const periodWins = periodMatches.filter(m => m.result === 'Win').length;
      const periodWR = Math.round(periodWins / periodMatches.length * 100);
      
      if (periodWR > bestWR) {
        bestWR = periodWR;
        bestTime = period.name;
      }
    }
  });
  
  if (bestTime) {
    insights += `<p>⏰ <strong>You perform best during ${bestTime}</strong> with a ${bestWR}% win rate. Consider scheduling your play sessions during this time.</p>`;
  }
  
  strategicInsights.innerHTML = insights;
}

function updateTrendChart(session) {
  const trendChartCanvas = document.getElementById('trendChart');
  if (!trendChartCanvas) return;
  
  const ctx = trendChartCanvas.getContext('2d');
  
  if (trendChart) {
    trendChart.destroy();
    trendChart = null;
  }
  
  const matches = session.matches;
  if (matches.length === 0) return;
  
  const movingAverages = [];
  for (let i = 0; i < matches.length; i++) {
    const start = Math.max(0, i - 9);
    const recentMatches = matches.slice(start, i + 1);
    const wins = recentMatches.filter(m => m.result === 'Win').length;
    const wr = recentMatches.length > 0 ? (wins / recentMatches.length) * 100 : 0;
    movingAverages.push(Math.round(wr));
  }
  
  const labels = matches.map((_, i) => i + 1);
  
  trendChart = new Chart(ctx, {
    type: 'line',
    data: { 
      labels, 
      datasets: [
        { 
          label: 'Win Rate (10-match avg)', 
          data: movingAverages, 
          tension: 0.3, 
          borderColor: 'rgba(51, 194, 255, 0.95)', 
          backgroundColor: 'rgba(51, 194, 255, 0.1)', 
          fill: true, 
          pointRadius: 2,
          borderWidth: 2
        }
      ] 
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: { 
        legend: { 
          display: true,
          position: 'top'
        } 
      }, 
      scales: {
        x: {
          title: { 
            display: true, 
            text: 'Match #',
            color: 'var(--muted)'
          },
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: 'var(--muted)'
          }
        }, 
        y: {
          title: { 
            display: true, 
            text: 'Win Rate %',
            color: 'var(--muted)'
          },
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: 'var(--muted)'
          }
        }
      },
      animation: {
        duration: 300,
        easing: 'easeOutQuart'
      }
    }
  });
}

// ==================== الآلة الحاسبة الهايبرجيومترية ====================

function factorial(n) {
  if (n < 0) return 0;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

function combination(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  return factorial(n) / (factorial(k) * factorial(n - k));
}

function hypergeometricProbability(N, K, n, k) {
  if (k > K || k > n || (n - k) > (N - K)) return 0;
  const numerator = combination(K, k) * combination(N - K, n - k);
  const denominator = combination(N, n);
  return numerator / denominator;
}

function calculateHypergeometric() {
  const deckSizeInput = document.getElementById('deckSize');
  const copiesRanInput = document.getElementById('copiesRan');
  const cardsDrawnInput = document.getElementById('cardsDrawn');
  const oddsToHaveInput = document.getElementById('oddsToHave');
  const hyperResults = document.getElementById('hyperResults');
  
  if (!deckSizeInput || !copiesRanInput || !cardsDrawnInput || !oddsToHaveInput || !hyperResults) return;
  
  const deckSize = parseInt(deckSizeInput.value);
  const copiesRan = parseInt(copiesRanInput.value);
  const cardsDrawn = parseInt(cardsDrawnInput.value);
  const oddsToHave = parseInt(oddsToHaveInput.value);
  
  if (isNaN(deckSize) || isNaN(copiesRan) || isNaN(cardsDrawn) || isNaN(oddsToHave)) {
    alert('Please enter valid numbers');
    return;
  }
  
  if (copiesRan > deckSize) {
    alert('Copies ran cannot be greater than deck size');
    return;
  }
  
  if (cardsDrawn > deckSize) {
    alert('Cards drawn cannot be greater than deck size');
    return;
  }
  
  let probLess1 = 0;
  let probLessEqual1 = 0;
  let probEqual1 = 0;
  let probGreaterEqual1 = 0;
  let probGreater1 = 0;
  
  for (let k = 0; k <= Math.min(copiesRan, cardsDrawn); k++) {
    const prob = hypergeometricProbability(deckSize, copiesRan, cardsDrawn, k);
    
    if (k < oddsToHave) probLess1 += prob;
    if (k <= oddsToHave) probLessEqual1 += prob;
    if (k === oddsToHave) probEqual1 += prob;
    if (k >= oddsToHave) probGreaterEqual1 += prob;
    if (k > oddsToHave) probGreater1 += prob;
  }
  
  const expectedValue = (cardsDrawn * copiesRan) / deckSize;
  
  document.getElementById('oddsLess1').textContent = (probLess1 * 100).toFixed(2) + '%';
  document.getElementById('oddsLessEqual1').textContent = (probLessEqual1 * 100).toFixed(2) + '%';
  document.getElementById('oddsEqual1').textContent = (probEqual1 * 100).toFixed(2) + '%';
  document.getElementById('oddsGreaterEqual1').textContent = (probGreaterEqual1 * 100).toFixed(2) + '%';
  document.getElementById('oddsGreater1').textContent = (probGreater1 * 100).toFixed(2) + '%';
  document.getElementById('expectedValue').textContent = expectedValue.toFixed(2);
  
  document.getElementById('oddsLessLabel').textContent = `Odds of < ${oddsToHave}:`;
  document.getElementById('oddsLessEqualLabel').textContent = `Odds of ≤ ${oddsToHave}:`;
  document.getElementById('oddsEqualLabel').textContent = `Odds of = ${oddsToHave}:`;
  document.getElementById('oddsGreaterEqualLabel').textContent = `Odds of ≥ ${oddsToHave}:`;
  document.getElementById('oddsGreaterLabel').textContent = `Odds of > ${oddsToHave}:`;
  
  hyperResults.style.display = 'block';
}

// ==================== محاكي الاحتمالات ====================

function initDeckSimulator() {
  const simulateBtn = document.getElementById('simulateBtn');
  const deckText = document.getElementById('deckText');
  const comboText = document.getElementById('comboText');
  const autoSimulate = document.getElementById('autoSimulate');
  const deckPreset = document.getElementById('deckPreset');
  const comboPreset = document.getElementById('comboPreset');
  const newDeckBtn = document.getElementById('newDeckBtn');
  const newComboBtn = document.getElementById('newComboBtn');
  
  if (simulateBtn) {
    simulateBtn.addEventListener('click', runDeckSimulation);
  }
  
  if (deckText && comboText) {
    deckText.addEventListener('input', handleDeckInput);
    comboText.addEventListener('input', handleComboInput);
  }
  
  if (autoSimulate) {
    autoSimulate.addEventListener('change', handleAutoSimulate);
  }
  
  if (deckPreset) {
    deckPreset.addEventListener('change', handleDeckPreset);
  }
  
  if (comboPreset) {
    comboPreset.addEventListener('change', handleComboPreset);
  }
  
  if (newDeckBtn) {
    newDeckBtn.addEventListener('click', async () => {
      if (deckText) deckText.value = '# New Deck\n40 total\n\n# Add your cards here';
      if (deckPreset) deckPreset.value = 'custom';
    });
  }
  
  if (newComboBtn) {
    newComboBtn.addEventListener('click', async () => {
      if (comboText) comboText.value = '# New Combo\n\n# Add your combo requirements here';
      if (comboPreset) comboPreset.value = 'custom';
    });
  }
}

function handleAutoSimulate() {
  if (autoSimulate && autoSimulate.checked) {
    runDeckSimulation();
  }
}

function handleDeckInput() {
  const deckPreset = document.getElementById('deckPreset');
  if (deckPreset) deckPreset.value = 'custom';
  
  const autoSimulate = document.getElementById('autoSimulate');
  if (autoSimulate && autoSimulate.checked) {
    setTimeout(runDeckSimulation, 500);
  }
}

function handleComboInput() {
  const comboPreset = document.getElementById('comboPreset');
  if (comboPreset) comboPreset.value = 'custom';
  
  const autoSimulate = document.getElementById('autoSimulate');
  if (autoSimulate && autoSimulate.checked) {
    setTimeout(runDeckSimulation, 500);
  }
}

function handleDeckPreset(e) {
  if (e.target.value === 'default') {
    const deckText = document.getElementById('deckText');
    if (deckText) {
      deckText.value = `# Add your deck here
40 total
3 card a
3 card b
3 card c
3 card d
3 card e
3 card f
1 card g
2 draw2
3 pickfrom6`;
    }
  }
}

function handleComboPreset(e) {
  if (e.target.value === 'default') {
    const comboText = document.getElementById('comboText');
    if (comboText) {
      comboText.value = `# Add your combo requirements here
card a
card b + (card c | card d)
card b + 2 card e
card b + card f + -1 card g`;
    }
  }
}

function runDeckSimulation() {
  const deckText = document.getElementById('deckText');
  const comboText = document.getElementById('comboText');
  const simHandSize = document.getElementById('simHandSize');
  const simTrials = document.getElementById('simTrials');
  const deckErrors = document.getElementById('deckErrors');
  const comboErrors = document.getElementById('comboErrors');
  const simulationResult = document.getElementById('simulationResult');
  
  if (!deckText || !comboText || !simHandSize || !simTrials || !simulationResult) return;
  
  const deckTextValue = deckText.value;
  const comboTextValue = comboText.value;
  const handSize = parseInt(simHandSize.value) || 5;
  const trials = parseInt(simTrials.value) || 100000;
  
  if (deckErrors) deckErrors.textContent = '';
  if (comboErrors) comboErrors.textContent = '';
  
  const { deck, deckErrors: deckParseErrors, total: deckSize } = parseDeck(deckTextValue);
  const { combo, comboErrors: comboParseErrors } = parseCombo(comboTextValue);
  
  if (deckParseErrors.length > 0 && deckErrors) {
    deckErrors.textContent = 'Deck errors: ' + deckParseErrors.join(', ');
  }
  
  if (comboParseErrors.length > 0 && comboErrors) {
    comboErrors.textContent = 'Combo errors: ' + comboParseErrors.join(', ');
  }
  
  if (deckParseErrors.length > 0 || comboParseErrors.length > 0) {
    simulationResult.textContent = 'Error';
    return;
  }
  
  if (deck.length === 0) {
    simulationResult.textContent = '0%';
    return;
  }
  
  const probability = calculateProbabilityWithSpecialCards(deck, combo, handSize, trials, deckSize);
  simulationResult.textContent = (probability * 100).toFixed(4) + '%';
}

function parseDeck(deckText) {
  const deck = [];
  const deckErrors = [];
  let total = 40;
  
  const lines = deckText.split('\n').map(line => line.trim()).filter(line => !!line && !line.startsWith('#'));
  
  for (const line of lines) {
    const totalMatch = line.match(/^(\d+)\s+total$/i);
    if (totalMatch) {
      total = parseInt(totalMatch[1]);
      continue;
    }
    
    const cardMatch = line.match(/^(\d+)\s+(.+)$/);
    if (!cardMatch) {
      deckErrors.push(`Invalid line: "${line}"`);
      continue;
    }
    
    const count = parseInt(cardMatch[1]);
    const cardName = cardMatch[2].trim();
    
    if (isNaN(count) || count < 1) {
      deckErrors.push(`Invalid count in: "${line}"`);
      continue;
    }
    
    for (let i = 0; i < count; i++) {
      deck.push(cardName);
    }
  }
  
  while (deck.length < total) {
    deck.push('UNKNOWN CARD');
  }
  
  if (deck.length > total) {
    deck.length = total;
  }
  
  return { deck, deckErrors, total };
}

function parseRequirement(requirementText) {
  requirementText = requirementText.trim();
  
  const negativeMatch = requirementText.match(/^-(\d+)\s+(.+)$/);
  if (negativeMatch) {
    return {
      card: negativeMatch[2].trim(),
      count: parseInt(negativeMatch[1]),
      inDeck: true
    };
  }
  
  const positiveMatch = requirementText.match(/^(\d+)\s+(.+)$/);
  if (positiveMatch) {
    return {
      card: positiveMatch[2].trim(),
      count: parseInt(positiveMatch[1]),
      inDeck: false
    };
  }
  
  return {
    card: requirementText,
    count: 1,
    inDeck: false
  };
}

function parseCombo(comboText) {
  const combo = [];
  const comboErrors = [];
  
  const lines = comboText.split('\n').map(line => line.trim()).filter(line => !!line && !line.startsWith('#'));
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const andGroups = line.split('+').map(part => part.trim());
      const comboLine = [];
      
      for (const andPart of andGroups) {
        if (andPart.startsWith('(') && andPart.endsWith(')')) {
          const orParts = andPart.slice(1, -1).split('|').map(p => p.trim());
          const orRequirements = orParts.map(parseRequirement);
          comboLine.push(orRequirements);
        } else {
          comboLine.push([parseRequirement(andPart)]);
        }
      }
      
      combo.push(comboLine);
    } catch (error) {
      comboErrors.push(`Error parsing: "${line}" - ${error.message}`);
    }
  }
  
  return { combo, comboErrors };
}

function calculateProbabilityWithSpecialCards(deck, combo, handSize, trials, deckSize) {
  let successCount = 0;
  
  for (let i = 0; i < trials; i++) {
    const result = drawHandWithSpecialCards(deck, handSize, deckSize);
    if (checkComboImproved(result.hand, combo, result.remainingDeck)) {
      successCount++;
    }
  }
  
  return successCount / trials;
}

function drawHandWithSpecialCards(deck, handSize, deckSize) {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  let hand = shuffled.slice(0, handSize);
  let remainingDeck = shuffled.slice(handSize);
  
  let finalHand = [...hand];
  let finalRemainingDeck = [...remainingDeck];
  
  for (let i = 0; i < hand.length; i++) {
    const card = hand[i];
    
    if (card === 'draw2' && finalRemainingDeck.length >= 2) {
      finalHand = finalHand.filter(c => c !== 'draw2');
      finalHand.push(...finalRemainingDeck.splice(0, 2));
    } else if (card.startsWith('pickfrom') && finalRemainingDeck.length >= 6) {
      const pickCount = parseInt(card.replace('pickfrom', ''));
      if (!isNaN(pickCount) && finalRemainingDeck.length >= pickCount) {
        finalHand = finalHand.filter(c => c !== card);
        const options = finalRemainingDeck.splice(0, pickCount);
        const chosen = options[Math.floor(Math.random() * options.length)];
        finalHand.push(chosen);
        finalRemainingDeck.push(...options.filter(c => c !== chosen));
      }
    }
  }
  
  return {
    hand: finalHand,
    remainingDeck: finalRemainingDeck
  };
}

function checkComboImproved(hand, combo, remainingDeck) {
  for (const comboLine of combo) {
    if (checkComboLineImproved(hand, comboLine, remainingDeck)) {
      return true;
    }
  }
  return false;
}

function checkComboLineImproved(hand, comboLine, remainingDeck) {
  for (const andCondition of comboLine) {
    let conditionMet = false;
    
    for (const requirement of andCondition) {
      if (checkRequirementImproved(hand, requirement, remainingDeck)) {
        conditionMet = true;
        break;
      }
    }
    
    if (!conditionMet) {
      return false;
    }
  }
  
  return true;
}

function checkRequirementImproved(hand, requirement, remainingDeck) {
  const { card, count, inDeck } = requirement;
  
  if (inDeck) {
    const totalInDeck = remainingDeck.filter(c => c === card).length;
    return totalInDeck >= count;
  } else {
    const inHand = hand.filter(c => c === card).length;
    return inHand >= count;
  }
}

// ==================== Deck Calculator ====================

function initDeckCalculator() {
  const deckCalcCalculateBtn = document.getElementById('deckCalcCalculateBtn');
  
  if (deckCalcCalculateBtn) {
    deckCalcCalculateBtn.addEventListener('click', calculateDeckProbabilities);
  }
  
  // إعداد القيم الافتراضية
  const deckCalcDeckSize = document.getElementById('deckCalcDeckSize');
  const deckCalcCopies = document.getElementById('deckCalcCopies');
  const deckCalcHandSize = document.getElementById('deckCalcHandSize');
  const deckCalcDesiredCopies = document.getElementById('deckCalcDesiredCopies');
  
  if (deckCalcDeckSize) deckCalcDeckSize.value = '40';
  if (deckCalcCopies) deckCalcCopies.value = '3';
  if (deckCalcHandSize) deckCalcHandSize.value = '5';
  if (deckCalcDesiredCopies) deckCalcDesiredCopies.value = '1';
}

function calculateDeckProbabilities() {
  const deckCalcDeckSize = document.getElementById('deckCalcDeckSize');
  const deckCalcCopies = document.getElementById('deckCalcCopies');
  const deckCalcHandSize = document.getElementById('deckCalcHandSize');
  const deckCalcDesiredCopies = document.getElementById('deckCalcDesiredCopies');
  const deckCalcResults = document.getElementById('deckCalcResults');
  
  if (!deckCalcDeckSize || !deckCalcCopies || !deckCalcHandSize || !deckCalcDesiredCopies || !deckCalcResults) return;
  
  const deckSize = parseInt(deckCalcDeckSize.value);
  const copies = parseInt(deckCalcCopies.value);
  const handSize = parseInt(deckCalcHandSize.value);
  const desiredCopies = parseInt(deckCalcDesiredCopies.value);
  
  if (isNaN(deckSize) || isNaN(copies) || isNaN(handSize) || isNaN(desiredCopies)) {
    alert('Please enter valid numbers');
    return;
  }
  
  let probExactly = 0;
  let probAtLeast = 0;
  let probAtMost = 0;
  
  for (let k = 0; k <= Math.min(copies, handSize); k++) {
    const prob = hypergeometricProbability(deckSize, copies, handSize, k);
    
    if (k === desiredCopies) probExactly = prob;
    if (k >= desiredCopies) probAtLeast += prob;
    if (k <= desiredCopies) probAtMost += prob;
  }
  
  const expectedValue = (handSize * copies) / deckSize;
  
  deckCalcResults.innerHTML = `
    <div class="calc-result-item">
      <span class="calc-result-label">Probability of exactly ${desiredCopies} copy:</span>
      <span class="calc-result-value">${(probExactly * 100).toFixed(2)}%</span>
    </div>
    <div class="calc-result-item">
      <span class="calc-result-label">Probability of at least ${desiredCopies} copy:</span>
      <span class="calc-result-value">${(probAtLeast * 100).toFixed(2)}%</span>
    </div>
    <div class="calc-result-item">
      <span class="calc-result-label">Probability of at most ${desiredCopies} copy:</span>
      <span class="calc-result-value">${(probAtMost * 100).toFixed(2)}%</span>
    </div>
    <div class="calc-result-item">
      <span class="calc-result-label">Expected value:</span>
      <span class="calc-result-value">${expectedValue.toFixed(2)} copies</span>
    </div>
  `;
  
  deckCalcResults.style.display = 'block';
}

// ==================== نظام الأرشيف ====================

async function loadAllPlayers() {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, username, created_at, last_active')
    .order('username');
  
  if (error) {
    console.error('Error loading players:', error);
    return [];
  }
  
  return data;
}

async function loadPlayerData(userId) {
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error loading player data:', error);
    return null;
  }
  
  let allMatches = [];
  let allDecks = new Set();
  
  sessions.forEach(session => {
    if (session.matches && Array.isArray(session.matches)) {
      allMatches = allMatches.concat(session.matches.map(match => ({
        ...match,
        sessionName: session.name
      })));
    }
    
    if (session.decks && Array.isArray(session.decks)) {
      session.decks.forEach(deck => allDecks.add(deck));
    }
  });
  
  return {
    matches: allMatches,
    decks: Array.from(allDecks),
    sessions: sessions
  };
}

async function initArchive() {
  await loadPlayersForArchive();
  
  const archivePlayerSelect = document.getElementById('archivePlayerSelect');
  const refreshArchiveBtn = document.getElementById('refreshArchiveBtn');
  
  if (!archivePlayerSelect || !refreshArchiveBtn) return;
  
archivePlayerSelect.addEventListener('change', async () => {
  const userId = archivePlayerSelect.value;
  if (userId) {
    await loadPlayerArchive(userId);
  } else {
    const archiveContent = document.getElementById('archiveContent');
    const archiveEmpty = document.getElementById('archiveEmpty');
    if (archiveContent) archiveContent.style.display = 'none';
    if (archiveEmpty) archiveEmpty.style.display = 'block';
  }
});
  
  refreshArchiveBtn.addEventListener('click', async () => {
    await loadPlayersForArchive();
    const currentUserId = archivePlayerSelect.value;
    if (currentUserId) {
      await loadPlayerArchive(currentUserId);
    }
  });
}

async function loadPlayersForArchive() {
  const players = await loadAllPlayers();
  const archivePlayerSelect = document.getElementById('archivePlayerSelect');
  
  if (!archivePlayerSelect) return;
  
  archivePlayerSelect.innerHTML = '<option value="">Select a player...</option>';
  players.forEach(player => {
    const option = document.createElement('option');
    option.value = player.user_id;
    option.textContent = player.username;
    archivePlayerSelect.appendChild(option);
  });
}

async function loadPlayerArchive(userId) {
  const playerData = await loadPlayerData(userId);
  const archiveContent = document.getElementById('archiveContent');
  const archiveEmpty = document.getElementById('archiveEmpty');
  
  if (!archiveContent || !archiveEmpty) return;
  
  if (!playerData || playerData.matches.length === 0) {
    archiveContent.style.display = 'none';
    archiveEmpty.style.display = 'block';
    archiveEmpty.innerHTML = `
      <div style="font-size:18px;margin-bottom:8px">No data available</div>
      <div class="small">This player doesn't have any match data yet</div>
    `;
    return;
  }
  
  archiveContent.style.display = 'block';
  archiveEmpty.style.display = 'none';
  
  updateArchiveChart(playerData.matches);
  renderArchiveMatrix(playerData);
  renderArchiveDeckPerformance(playerData);
  renderArchiveMatches(playerData.matches);
}

function updateArchiveChart(matches) {
  const archivePointsChartCanvas = document.getElementById('archivePointsChart');
  if (!archivePointsChartCanvas) return;
  
  const ctx = archivePointsChartCanvas.getContext('2d');
  
  if (archivePointsChart) {
    archivePointsChart.destroy();
    archivePointsChart = null;
  }
  
  if (matches.length > 0) {
    const pointsData = [];
    let currentPoints = matches[0].pointsBefore || START_POINTS_RATED;
    
    matches.forEach((match, index) => {
      pointsData.push({
        match: index + 1,
        points: match.pointsAfter || currentPoints
      });
      currentPoints = match.pointsAfter || currentPoints;
    });
    
    const labels = pointsData.map(d => d.match);
    const data = pointsData.map(d => d.points);
    
    archivePointsChart = new Chart(ctx, {
      type: 'line',
      data: { 
        labels, 
        datasets: [
          { 
            label: 'Points', 
            data, 
            tension: 0.28, 
            borderColor: 'rgba(124,92,255,0.95)', 
            backgroundColor: 'rgba(124,92,255,0.08)', 
            fill: true, 
            pointRadius: 3,
            borderWidth: 2
          }
        ] 
      },
      options: { 
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            display: false 
          } 
        }, 
        scales: {
          x: {
            title: { 
              display: true, 
              text: 'Match #',
              color: 'var(--muted)'
            },
            grid: {
              color: 'rgba(255,255,255,0.05)'
            },
            ticks: {
              color: 'var(--muted)'
            }
          }, 
          y: {
            title: { 
              display: true, 
              text: 'Points',
              color: 'var(--muted)'
            },
            grid: {
              color: 'rgba(255,255,255,0.05)'
            },
            ticks: {
              color: 'var(--muted)'
            }
          }
        }
      }
    });
  }
}

function renderArchiveMatrix(playerData) {
  const archiveMatrixContainer = document.getElementById('archiveMatrixContainer');
  if (!archiveMatrixContainer) return;
  
  const { matches, decks } = playerData;
  
  archiveMatrixContainer.innerHTML = '';
  
  const matrix = {};
  decks.forEach(r => { 
    matrix[r] = {}; 
    decks.forEach(c => matrix[r][c] = {w:0, l:0}); 
  });
  
  matches.forEach(m => {
    if(!matrix[m.deck]) matrix[m.deck] = {};
    if(!matrix[m.deck][m.opp]) matrix[m.deck][m.opp] = {w:0, l:0};
    
    if(m.result === 'Win') matrix[m.deck][m.opp].w++;
    else matrix[m.deck][m.opp].l++;
  });
  
  const tbl = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headRow.appendChild(document.createElement('th'));
  
  decks.forEach(d => { 
    const th = document.createElement('th'); 
    th.textContent = d; 
    headRow.appendChild(th); 
  });
  
  thead.appendChild(headRow);
  tbl.appendChild(thead);

  const tbody = document.createElement('tbody');
  decks.forEach(r => {
    const tr = document.createElement('tr');
    const th = document.createElement('th'); 
    th.style.textAlign = 'left'; 
    th.style.paddingLeft = '8px'; 
    th.textContent = r; 
    tr.appendChild(th);
    
    decks.forEach(c => {
      const td = document.createElement('td');
      const stat = (matrix[r] && matrix[r][c]) ? matrix[r][c] : {w:0, l:0};
      const total = stat.w + stat.l;
      
      if(total === 0){
        td.innerHTML = `<div class="cell" style="background:${hexWithOpacity('#101418',0.9)};color:var(--muted)">—</div>`;
      } else {
        const pct = Math.round((stat.w / total) * 1000) / 10;
        let bgColor = '#999';
        
        if(pct >= 70) bgColor = hexWithOpacity('#23c46b', 0.94);
        else if(pct >= 40) bgColor = hexWithOpacity('#f0b429', 0.92);
        else bgColor = hexWithOpacity('#ff6b6b', 0.92);
        
        td.innerHTML = `
          <div class="cell" style="background:${bgColor};color:#021014">
            <div class="pct">${pct}%</div>
            <div class="wl">${stat.w} - ${stat.l}</div>
          </div>
        `;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  
  tbl.appendChild(tbody);
  archiveMatrixContainer.appendChild(tbl);
}

function renderArchiveDeckPerformance(playerData) {
  const archiveDeckPerfTableBody = document.querySelector('#archiveDeckPerfTable tbody');
  if (!archiveDeckPerfTableBody) return;
  
  const { matches, decks } = playerData;
  
  archiveDeckPerfTableBody.innerHTML = '';
  
  decks.forEach(d => {
    const deckMatches = matches.filter(m => m.deck === d);
    const wins = deckMatches.filter(m => m.result === 'Win').length;
    
    const matches1 = deckMatches.filter(m => m.turn === '1st');
    const wins1 = matches1.filter(m => m.result === 'Win').length;
    const matches2 = deckMatches.filter(m => m.turn === '2nd');
    const wins2 = matches2.filter(m => m.result === 'Win').length;
    
    const wr = deckMatches.length ? (Math.round(wins / deckMatches.length * 1000) / 10 + '%') : '-';
    const wr1 = matches1.length ? (Math.round(wins1 / matches1.length * 1000) / 10 + '%') : '-';
    const wr2 = matches2.length ? (Math.round(wins2 / matches2.length * 1000) / 10 + '%') : '-';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(d)}</td>
      <td>${deckMatches.length}</td>
      <td>${wins}</td>
      <td>${wr}</td>
      <td>${wr1}</td>
      <td>${wr2}</td>
    `;
    archiveDeckPerfTableBody.appendChild(tr);
  });
}

function renderArchiveMatches(matches) {
  const archiveMatchesTableBody = document.querySelector('#archiveMatchesTable tbody');
  if (!archiveMatchesTableBody) return;
  
  archiveMatchesTableBody.innerHTML = '';
  
  const recentMatches = matches.slice(-20).reverse();
  
  recentMatches.forEach(match => {
    const tr = document.createElement('tr');
    const resText = match.result === 'Win' ? '🏆 Win' : '❌ Loss';
    const date = new Date(match.createdAt).toLocaleDateString();
    
    tr.innerHTML = `
      <td>${escapeHtml(match.deck)}</td>
      <td>${escapeHtml(match.opp)}</td>
      <td>${resText}</td>
      <td>${escapeHtml(match.turn || '')}</td>
      <td>${match.pointsBefore}</td>
      <td>${match.pointsAfter}</td>
      <td>${date}</td>
    `;
    archiveMatchesTableBody.appendChild(tr);
  });
}

// ==================== نظام قوائم المجموعات ====================

async function renderDeckLists() {
  if (!currentUser) return;
  
  const deckListsContainer = document.getElementById('deckListsContainer');
  const bestDecksContainer = document.getElementById('bestDecksContainer');
  
  if (!deckListsContainer) return;
  
  const deckLists = await loadUserDeckLists(currentUser.id);
  
  deckListsContainer.innerHTML = '';
  
  if (bestDecksContainer) {
    bestDecksContainer.innerHTML = '';
  }
  
  if (deckLists.length === 0) {
    deckListsContainer.innerHTML = `
      <div class="card" style="text-align:center;padding:40px;grid-column:1/-1">
        <div style="font-size:18px;color:var(--muted);margin-bottom:8px">No deck lists found</div>
        <div class="small">Create your first deck list!</div>
      </div>
    `;
    return;
  }
  
  const updatedDeckLists = await updateDeckListStats(deckLists);
  
  if (bestDecksContainer) {
    const bestDecks = [...updatedDeckLists]
      .filter(deck => deck.stats.matches > 0)
      .sort((a, b) => {
        const aWR = parseFloat(a.stats.overallWR);
        const bWR = parseFloat(b.stats.overallWR);
        return bWR - aWR;
      })
      .slice(0, 3);
    
    if (bestDecks.length > 0) {
      bestDecks.forEach((deck, index) => {
        const bestDeckCard = document.createElement('div');
        bestDeckCard.className = 'best-deck-card';
        
        let rankColor = '';
        if (index === 0) rankColor = 'var(--warn)';
        else if (index === 1) rankColor = 'var(--muted)';
        else if (index === 2) rankColor = '#cd7f32';
        
        bestDeckCard.innerHTML = `
          <div class="best-deck-name">${escapeHtml(deck.name)}</div>
          <div class="best-deck-wr" style="color:${rankColor}">${deck.stats.overallWR}</div>
          <div class="best-deck-matches">${deck.stats.matches} matches</div>
        `;
        
        bestDecksContainer.appendChild(bestDeckCard);
      });
    }
  }
  
  updatedDeckLists.forEach(deckList => {
    const deckListCard = document.createElement('div');
    deckListCard.className = 'deck-list-card';
    
    deckListCard.innerHTML = `
      <div class="deck-list-header">
        <div style="font-weight:700">${escapeHtml(deckList.name)}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="small">${new Date(deckList.createdAt).toLocaleDateString()}</div>
          <button class="delete-btn" data-deck-id="${deckList.id}" title="Delete deck list">
            🗑️
          </button>
        </div>
      </div>
      
      ${deckList.image ? 
        `<div class="deck-list-image">
          <img src="${deckList.image}" alt="${deckList.name}" style="width:100%;border-radius:8px">
        </div>` : 
        `<div class="deck-list-image">
          <div class="small">No image</div>
        </div>`
      }
      
      ${deckList.description ? 
        `<div style="margin-bottom:12px;font-size:14px">${escapeHtml(deckList.description)}</div>` : 
        ''
      }
      
      <div class="deck-list-stats">
        <div class="deck-list-stat">
          <div class="deck-list-stat-value">${deckList.stats.overallWR}</div>
          <div class="deck-list-stat-label">Overall WR</div>
        </div>
        <div class="deck-list-stat">
          <div class="deck-list-stat-value">${deckList.stats.wrGoing1st}</div>
          <div class="deck-list-stat-label">WR Going 1st</div>
        </div>
        <div class="deck-list-stat">
          <div class="deck-list-stat-value">${deckList.stats.wrGoing2nd}</div>
          <div class="deck-list-stat-label">WR Going 2nd</div>
        </div>
        <div class="deck-list-stat">
          <div class="deck-list-stat-value">${deckList.stats.matches}</div>
          <div class="deck-list-stat-label">Matches</div>
        </div>
      </div>
    `;
    
    deckListsContainer.appendChild(deckListCard);
  });
  
document.querySelectorAll('.delete-btn[data-deck-id]').forEach(btn => {
  btn.addEventListener('click', async function() {
    const deckId = this.dataset.deckId;
    const deckName = this.closest('.deck-list-card')
                         .querySelector('.deck-list-header div:first-child')
                         .textContent;

    if (confirm(`Are you sure you want to delete "${deckName}"? This action cannot be undone.`)) {
      try {
        await deleteUserDeckList(deckId);
        await renderDeckLists();
        showAlert('Deck list deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting deck list:', error);
        showAlert('Error deleting deck list', 'error');
        }
      }
    });
  });
}

async function updateDeckListStats(deckLists) {
  let allMatches = [];
  Object.values(allSessions).forEach(session => {
    allMatches = allMatches.concat(session.matches);
  });
  
  const updatedDeckLists = [];
  for (let deckList of deckLists) {
    const deckName = deckList.name;
    const deckMatches = allMatches.filter(match => match.deck === deckName);
    
    if (deckMatches.length > 0) {
      const wins = deckMatches.filter(match => match.result === 'Win').length;
      const overallWR = Math.round(wins / deckMatches.length * 1000) / 10;
      
      const matches1st = deckMatches.filter(match => match.turn === '1st');
      const wins1st = matches1st.filter(match => match.result === 'Win').length;
      const wr1st = matches1st.length > 0 ? Math.round(wins1st / matches1st.length * 1000) / 10 : 0;
      
      const matches2nd = deckMatches.filter(match => match.turn === '2nd');
      const wins2nd = matches2nd.filter(match => match.result === 'Win').length;
      const wr2nd = matches2nd.length > 0 ? Math.round(wins2nd / matches2nd.length * 1000) / 10 : 0;
      
      deckList.stats = {
        matches: deckMatches.length,
        wins: wins,
        overallWR: `${overallWR}%`,
        wrGoing1st: `${wr1st}%`,
        wrGoing2nd: `${wr2nd}%`
      };
    } else {
      deckList.stats = {
        matches: 0,
        wins: 0,
        overallWR: '0%',
        wrGoing1st: '0%',
        wrGoing2nd: '0%'
      };
    }
    
    const updatedDeckList = await saveUserDeckList(deckList, currentUser.id);
    updatedDeckLists.push(updatedDeckList);
  }
  
  return updatedDeckLists;
}

// ==================== نظام الإعدادات ====================

function loadSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem('duelist_settings')) || defaultSettings;
    return {...defaultSettings, ...settings};
  } catch(e) {
    return defaultSettings;
  }
}

function saveSettings(settings) {
  localStorage.setItem('duelist_settings', JSON.stringify(settings));
}

function applySettings(settings) {
  document.documentElement.style.setProperty('--bg-opacity', settings.bgOpacity);
  document.documentElement.style.setProperty('--card-opacity', settings.cardOpacity);
  
  const bgOpacitySlider = document.getElementById('bgOpacity');
  const cardOpacitySlider = document.getElementById('cardOpacity');
  const bgOpacityValue = document.getElementById('bgOpacityValue');
  const cardOpacityValue = document.getElementById('cardOpacityValue');
  
  if (bgOpacitySlider) bgOpacitySlider.value = settings.bgOpacity;
  if (cardOpacitySlider) cardOpacitySlider.value = settings.cardOpacity;
  if (bgOpacityValue) bgOpacityValue.textContent = Math.round(settings.bgOpacity * 100) + '%';
  if (cardOpacityValue) cardOpacityValue.textContent = Math.round(settings.cardOpacity * 100) + '%';
  
  document.documentElement.setAttribute('data-theme', settings.theme);
  
  const themeOptions = document.querySelectorAll('.theme-option');
  const formulaOptions = document.querySelectorAll('.formula-option');
  
  themeOptions.forEach(option => {
    if (option.dataset.theme === settings.theme) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  formulaOptions.forEach(option => {
    if (option.dataset.formula === settings.pointsFormula) {
      option.classList.add('active');
    } else {
      option.classList.remove('active');
    }
  });
  
  updatePointsInfo(settings.pointsFormula);
}

function updatePointsInfo(formula) {
  const pointsInfo = document.getElementById('pointsInfo');
  if (!pointsInfo) return;
  
  if (formula === 'rated') {
    pointsInfo.innerHTML = `Start: <strong>${START_POINTS_RATED}</strong> • Win: <strong>+${DELTA_RATED}</strong> • Loss: <strong>-${DELTA_RATED}</strong>`;
  } else {
    pointsInfo.innerHTML = `Start: <strong>${START_POINTS_DC}k</strong> • Win: <strong>+${DELTA_DC_WIN}k</strong> • Loss: <strong>-${DELTA_DC_LOSS}k</strong> (or -${DELTA_DC_LOSS_BELOW_15}k if below ${DC_THRESHOLD}k)`;
  }
}

function initSettings() {
  const settings = loadSettings();
  applySettings(settings);
  
  const bgOpacitySlider = document.getElementById('bgOpacity');
  const cardOpacitySlider = document.getElementById('cardOpacity');
  const themeOptions = document.querySelectorAll('.theme-option');
  const formulaOptions = document.querySelectorAll('.formula-option');
  const resetSettingsBtn = document.getElementById('resetSettings');
  
  if (bgOpacitySlider) {
    bgOpacitySlider.addEventListener('input', function() {
      const value = parseFloat(this.value);
      const bgOpacityValue = document.getElementById('bgOpacityValue');
      if (bgOpacityValue) bgOpacityValue.textContent = Math.round(value * 100) + '%';
      const settings = loadSettings();
      settings.bgOpacity = value;
      saveSettings(settings);
      applySettings(settings);
    });
  }
  
  if (cardOpacitySlider) {
    cardOpacitySlider.addEventListener('input', function() {
      const value = parseFloat(this.value);
      const cardOpacityValue = document.getElementById('cardOpacityValue');
      if (cardOpacityValue) cardOpacityValue.textContent = Math.round(value * 100) + '%';
      const settings = loadSettings();
      settings.cardOpacity = value;
      saveSettings(settings);
      applySettings(settings);
    });
  }
  
  if (themeOptions) {
    themeOptions.forEach(option => {
      option.addEventListener('click', function() {
        const theme = this.dataset.theme;
        const settings = loadSettings();
        settings.theme = theme;
        saveSettings(settings);
        applySettings(settings);
      });
    });
  }
  
  if (formulaOptions) {
    formulaOptions.forEach(option => {
      option.addEventListener('click', function() {
        const formula = this.dataset.formula;
        const settings = loadSettings();
        settings.pointsFormula = formula;
        saveSettings(settings);
        applySettings(settings);
        
        updatePointsInfo(formula);
        
        Object.keys(allSessions).forEach(id => {
          const session = allSessions[id];
          session.pointsStart = formula === 'rated' ? START_POINTS_RATED : START_POINTS_DC;
          recalcSession(session);
        });
        
        if (currentSessionId) {
          renderMatches();
          updateCurrentAndPeakPoints();
        }
      });
    });
  }
  
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', function() {
      if (confirm('Reset all settings to default?')) {
        saveSettings(defaultSettings);
        applySettings(defaultSettings);
        
        Object.keys(allSessions).forEach(id => {
          const session = allSessions[id];
          session.pointsStart = defaultSettings.pointsFormula === 'rated' ? START_POINTS_RATED : START_POINTS_DC;
          recalcSession(session);
        });
        
        if (currentSessionId) {
          renderMatches();
          updateCurrentAndPeakPoints();
        }
      }
    });
  }
}

// ==================== دوال مساعدة ====================

function escapeHtml(str){ 
  return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); 
}

function hexWithOpacity(hex, opacity){ 
  hex = hex.replace('#',''); 
  const r = parseInt(hex.substring(0,2),16); 
  const g = parseInt(hex.substring(2,4),16); 
  const b = parseInt(hex.substring(4,6),16); 
  return `rgba(${r},${g},${b},${opacity})`; 
}

function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    transition: all 0.3s ease;
    background: ${type === 'success' ? 'var(--good)' : type === 'error' ? 'var(--bad)' : 'var(--accent1)'};
  `;
  alertDiv.textContent = message;
  
  document.body.appendChild(alertDiv);
  
  setTimeout(async () => {
    alertDiv.style.opacity = '0';
    setTimeout(async () => {
      document.body.removeChild(alertDiv);
    }, 300);
  }, 3000);
}

function updateCurrentAndPeakPoints() {
  if (!currentUser || !currentSessionId) return;
  
  const currentSession = allSessions[currentSessionId];
  const settings = loadSettings();
  const isDCFormula = settings.pointsFormula === 'dc';
  
  const currentPts = currentSession.matches.length ? currentSession.matches[currentSession.matches.length - 1].pointsAfter : currentSession.pointsStart;
  const peakPts = currentSession.peakPoints || currentSession.pointsStart;
  
  const formatPoints = (pts) => isDCFormula ? `${pts}k` : pts;
  
  const userRank = document.getElementById('userRank');
  if (userRank) {
    userRank.textContent = `Points: ${formatPoints(currentPts)} | Peak: ${formatPoints(peakPts)}`;
  }
}

function updateUserProfile() {
  if (!currentUser) return;
  
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userRank = document.getElementById('userRank');
  
  const displayName = currentUser.user_metadata?.full_name || 
                     currentUser.user_metadata?.user_name || 
                     currentUser.email || 
                     'User';
  
  const avatarLetter = displayName.charAt(0).toUpperCase();
  
  if (userAvatar) userAvatar.textContent = avatarLetter;
  if (userName) userName.textContent = displayName;
  
  if (userRank) {
    userRank.textContent = 'Connected via Discord';
  }
}

function checkConsecutiveLosses(session) {
  const arr = session.matches || [];
  let cnt = 0;
  
  for(let i = arr.length - 1; i >= 0; i--){
    if(arr[i].result === 'Loss') cnt++;
    else break;
  }
  
  if(cnt>0 && cnt % 5 === 0){
    showAlert('Relax, analyze the situation and get back to do better');
  }
}

// ==================== نظام التصدير والاستيراد ====================

async function exportSession() {
  if (!currentUser || !currentSessionId) return;
  
  const session = allSessions[currentSessionId];
  const blob = new Blob([JSON.stringify(session, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = (session.name.replace(/[^a-z0-9_\-]/gi,'_') || 'session') + '.json'; 
  a.click(); 
  URL.revokeObjectURL(url);
}

 function exportAll() {
  if (!currentUser) return;
  
  const blob = new Blob([JSON.stringify(allSessions, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob); 
  const a = document.createElement('a'); 
  a.href = url; 
  a.download = 'duelist_all_sessions.json'; 
  a.click(); 
  URL.revokeObjectURL(url);
}

async function importSession(file) { // ✅ أضف async
  const fr = new FileReader();
  fr.onload = async (e) => { // ✅ أضف async
    try{
      const parsed = JSON.parse(e.target.result);
      
      if (!currentUser) {
        alert('Please log in first');
        return;
      }
      
      let sessionData;
      if (Array.isArray(parsed)) {
        sessionData = {
          name: 'Imported Session',
          matches: parsed,
          decks: defaultDecks.slice(),
          pointsStart: START_POINTS_RATED
        };
      } else if (parsed.matches) {
        sessionData = {
          name: parsed.name || 'Imported Session',
          matches: parsed.matches,
          decks: parsed.decks || defaultDecks.slice(),
          pointsStart: parsed.pointsStart || START_POINTS_RATED
        };
      } else {
        alert('Invalid file format');
        return;
      }
      
      const savedSession = await saveUserSession(sessionData, currentUser.id);
      currentSessionId = savedSession.id;
      
      await renderAll();
      showAlert('Session imported successfully', 'success');
    } catch(err){ 
      alert('Invalid JSON file'); 
    }
  };
  fr.readAsText(file);
}

// ==================== إدارة Modals ====================

function showDeckModal() {
  const deckModal = document.getElementById('deckModal');
  const deckNameInput = document.getElementById('deckNameInput');
  
  if (deckModal && deckNameInput) {
    deckNameInput.value = '';
    deckModal.classList.add('active');
    deckNameInput.focus();
  }
}

function hideDeckModal() {
  const deckModal = document.getElementById('deckModal');
  if (deckModal) deckModal.classList.remove('active');
}

function addDeckFromModal() {
  const deckNameInput = document.getElementById('deckNameInput');
  if (!deckNameInput) return;
  
  const name = deckNameInput.value.trim();
  if (!name) return;
  
  if (!currentUser || !currentSessionId) {
    alert('Create/select a session first');
    return;
  }
  
  const currentSession = allSessions[currentSessionId];
  if (!currentSession.decks) currentSession.decks = defaultDecks.slice();
  
  if (currentSession.decks.includes(name)) {
    alert('Deck already exists');
    return;
  }
  
  currentSession.decks.push(name);
  saveUserSession(currentSession, currentUser.id);
  populateDecks();
  renderMatches();
  hideDeckModal();
}

function showSessionModal() {
  const sessionModal = document.getElementById('sessionModal');
  const sessionNameInput = document.getElementById('sessionNameInput');
  const sessionFormulaSelect = document.getElementById('sessionFormulaSelect');
  const sessionStartPoints = document.getElementById('sessionStartPoints');
  const sessionDefaultDeck = document.getElementById('sessionDefaultDeck');
  
  if (!sessionModal || !sessionNameInput) return;
  
  sessionNameInput.value = '';
  sessionFormulaSelect.value = 'rated';
  sessionStartPoints.value = '';
  
  sessionDefaultDeck.innerHTML = '<option value="">No default deck</option>';
  const currentSession = allSessions[currentSessionId];
  if (currentSession && currentSession.decks) {
    currentSession.decks.forEach(deck => {
      const option = document.createElement('option');
      option.value = deck;
      option.textContent = deck;
      sessionDefaultDeck.appendChild(option);
    });
  } else {
    defaultDecks.forEach(deck => {
      const option = document.createElement('option');
      option.value = deck;
      option.textContent = deck;
      sessionDefaultDeck.appendChild(option);
    });
  }
  
  sessionModal.classList.add('active');
  sessionNameInput.focus();
}

function hideSessionModal() {
  const sessionModal = document.getElementById('sessionModal');
  if (sessionModal) sessionModal.classList.remove('active');
}

async function createSessionFromModal() {
  const sessionNameInput = document.getElementById('sessionNameInput');
  const sessionFormulaSelect = document.getElementById('sessionFormulaSelect');
  const sessionStartPoints = document.getElementById('sessionStartPoints');
  const sessionDefaultDeck = document.getElementById('sessionDefaultDeck');
  
  if (!sessionNameInput) return;
  
  const name = sessionNameInput.value.trim();
  if (!name) {
    alert('Please enter a session name');
    return;
  }
  
  const formula = sessionFormulaSelect.value;
  const startPoints = sessionStartPoints.value ? parseInt(sessionStartPoints.value) : null;
  const defaultDeck = sessionDefaultDeck.value;
  
  let pointsStart;
  if (startPoints !== null) {
    pointsStart = startPoints;
  } else {
    pointsStart = formula === 'rated' ? START_POINTS_RATED : START_POINTS_DC;
  }
  
  const newSession = {
    name,
    matches: [],
    decks: defaultDecks.slice(),
    pointsStart,
    defaultDeck: defaultDeck || null,
    peakPoints: pointsStart
  };
  
  const savedSession = await saveUserSession(newSession, currentUser.id);
  currentSessionId = savedSession.id;
  
  await renderAll();
  hideSessionModal();
  
  if (defaultDeck) {
    setTimeout(async () => {
      const deckSelect = document.getElementById('deckSelect');
      if (deckSelect) {
        deckSelect.value = defaultDeck;
      }
    }, 100);
  }
}

function showDeckListModal() {
  const deckListModal = document.getElementById('deckListModal');
  const deckListName = document.getElementById('deckListName');
  const deckListImage = document.getElementById('deckListImage');
  const deckListDescription = document.getElementById('deckListDescription');
  
  if (deckListModal && deckListName) {
    deckListName.value = '';
    deckListImage.value = '';
    deckListDescription.value = '';
    deckListModal.classList.add('active');
    deckListName.focus();
  }
}

function hideDeckListModal() {
  const deckListModal = document.getElementById('deckListModal');
  if (deckListModal) deckListModal.classList.remove('active');
}

async function addDeckListFromModal() {
  const deckListName = document.getElementById('deckListName');
  const deckListImage = document.getElementById('deckListImage');
  const deckListDescription = document.getElementById('deckListDescription');
  
  if (!deckListName) return;
  
  const name = deckListName.value.trim();
  if (!name) {
    alert('Please enter a deck name');
    return;
  }
  
  const deckList = {
    name: name,
    image: deckListImage ? deckListImage.value.trim() || null : null,
    description: deckListDescription ? deckListDescription.value.trim() || null : null,
    stats: {
      matches: 0,
      wins: 0,
      overallWR: '0%',
      wrGoing1st: '0%',
      wrGoing2nd: '0%'
    }
  };
  
  try {
    await saveUserDeckList(deckList, currentUser.id);
    await renderDeckLists();
    hideDeckListModal();
    showAlert('Deck list created successfully', 'success');
  } catch (error) {
    console.error('Error creating deck list:', error);
    showAlert('Error creating deck list', 'error');
  }
}

// ==================== تهيئة التطبيق ====================

async function initializeApp() {
  console.log('🚀 Initializing application...');
  
  initSettings();
  initArchive();
  initDeckSimulator();
  initDeckCalculator();
  
  await renderAll();
  setupEventListeners();
  
  console.log('✅ Application initialized successfully');
}

async function renderAll() {
  await populateSessionSelect();
  await populateDecks();
  await renderMatches();
  await renderDeckLists();
}

async function setupEventListeners() {
  console.log('🔧 Setting up event listeners...');
  
  // Session elements
  const sessionSelect = document.getElementById('sessionSelect');
  const addMatchBtn = document.getElementById('addMatchBtn');
  const clearSessionBtn = document.getElementById('clearSessionBtn');
  
if (sessionSelect) {
  sessionSelect.addEventListener('change', async () => {
    currentSessionId = sessionSelect.value;
    await populateDecks();
    await renderMatches();
  });
}
  
  if (addMatchBtn) {
    addMatchBtn.addEventListener('click', addMatch);
  }
  
  if (clearSessionBtn) {
    clearSessionBtn.addEventListener('click', async () => {
      if (!currentUser || !currentSessionId) return;
      
      if (!confirm('Clear all matches in current session?')) return;
      
      const currentSession = allSessions[currentSessionId];
      currentSession.matches = [];
      await saveUserSession(currentSession, currentUser.id);
      await renderMatches();
    });
  }
  
  // إدارة المجموعات
  const addDeckBtn = document.getElementById('addDeckBtn');
  const addOppBtn = document.getElementById('addOppBtn');
  
  if (addDeckBtn) addDeckBtn.addEventListener('click', showDeckModal);
  if (addOppBtn) addOppBtn.addEventListener('click', showDeckModal);
  
  // إدارة الجلسات
  const openSessionsBtn = document.getElementById('openSessionsBtn');
  const createSessionBtn = document.getElementById('createSessionBtn');
  
  if (openSessionsBtn) {
    openSessionsBtn.addEventListener('click', async () => {
      const sessionsTab = document.querySelector('.tab[data-tab="sessions"]');
      if (sessionsTab) sessionsTab.click();
    });
  }
  
  if (createSessionBtn) {
    createSessionBtn.addEventListener('click', showSessionModal);
  }
  
  // التنبؤات
  const predictBtn = document.getElementById('predictBtn');
  if (predictBtn) {
    predictBtn.addEventListener('click', predictMatch);
  }
  
  // المقارنة
  const compareBtn = document.getElementById('compareBtn');
  if (compareBtn) {
    compareBtn.addEventListener('click', compareDecks);
  }
  
  // الآلة الحاسبة
  const calculateHyperBtn = document.getElementById('calculateHyperBtn');
  if (calculateHyperBtn) {
    calculateHyperBtn.addEventListener('click', calculateHypergeometric);
  }
  
  // Deck Calculator
  const deckCalcCalculateBtn = document.getElementById('deckCalcCalculateBtn');
  if (deckCalcCalculateBtn) {
    deckCalcCalculateBtn.addEventListener('click', calculateDeckProbabilities);
  }
  
  // إدارة قوائم المجموعات
  const addDeckListBtn = document.getElementById('addDeckListBtn');
  if (addDeckListBtn) {
    addDeckListBtn.addEventListener('click', showDeckListModal);
  }
  
  // التصدير والاستيراد
  const exportSessionBtn = document.getElementById('exportSessionBtn');
  const exportAllBtn2 = document.getElementById('exportAllBtn2');
  const importSessionBtn = document.getElementById('importSessionBtn');
  const importFileInput = document.getElementById('importFileInput');
  
  if (exportSessionBtn) exportSessionBtn.addEventListener('click', exportSession);
  if (exportAllBtn2) exportAllBtn2.addEventListener('click', exportAll);
  if (importSessionBtn) importSessionBtn.addEventListener('click', async () => {
    if (importFileInput) importFileInput.click();
  });
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      importSession(file);
      e.target.value = '';
    });
  }
  
  // إغلاق Modals
  const cancelDeckBtn = document.getElementById('cancelDeckBtn');
  const confirmDeckBtn = document.getElementById('confirmDeckBtn');
  const cancelSessionBtn = document.getElementById('cancelSessionBtn');
  const confirmSessionBtn = document.getElementById('confirmSessionBtn');
  const cancelDeckListBtn = document.getElementById('cancelDeckListBtn');
  const confirmDeckListBtn = document.getElementById('confirmDeckListBtn');
  
  if (cancelDeckBtn) cancelDeckBtn.addEventListener('click', hideDeckModal);
  if (confirmDeckBtn) confirmDeckBtn.addEventListener('click', addDeckFromModal);
  if (cancelSessionBtn) cancelSessionBtn.addEventListener('click', hideSessionModal);
  if (confirmSessionBtn) confirmSessionBtn.addEventListener('click', createSessionFromModal);
  if (cancelDeckListBtn) cancelDeckListBtn.addEventListener('click', hideDeckListModal);
  if (confirmDeckListBtn) confirmDeckListBtn.addEventListener('click', addDeckListFromModal);
  
  // إغلاق modals بالنقر خارجها
  const deckModal = document.getElementById('deckModal');
  const sessionModal = document.getElementById('sessionModal');
  const deckListModal = document.getElementById('deckListModal');
  
  if (deckModal) {
    deckModal.addEventListener('click', function(e) {
      if (e.target === deckModal) hideDeckModal();
    });
  }
  
  if (sessionModal) {
    sessionModal.addEventListener('click', function(e) {
      if (e.target === sessionModal) hideSessionModal();
    });
  }
  
  if (deckListModal) {
    deckListModal.addEventListener('click', function(e) {
      if (e.target === deckListModal) hideDeckListModal();
    });
  }
  
  // إغلاق modals بالزر Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      hideDeckModal();
      hideSessionModal();
      hideDeckListModal();
    }
  });
  
  // إدخال بالزر Enter في modals
  const deckNameInput = document.getElementById('deckNameInput');
  const sessionNameInput = document.getElementById('sessionNameInput');
  const deckListName = document.getElementById('deckListName');
  
  if (deckNameInput) {
    deckNameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') addDeckFromModal();
    });
  }
  
  if (sessionNameInput) {
    sessionNameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') createSessionFromModal();
    });
  }
  
  if (deckListName) {
    deckListName.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') addDeckListFromModal();
    });
  }
  
  // تبديل التبويبات
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.panel');
  
  tabs.forEach(t => {
    t.addEventListener('click', async () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const target = t.dataset.tab;
      
      panels.forEach(p => {
        if(p.id === 'panel-' + target) {
          p.classList.add('show');
          p.setAttribute('aria-hidden','false');
          
          if(target === 'stats') {
            setTimeout(async () => {
              if (currentSessionId) {
                const currentSession = allSessions[currentSessionId];
                updateChart(currentSession);
              }
            }, 100);
          } else if(target === 'predictions') {
            updatePredictionDecks();
          } else if(target === 'comparison') {
            updateComparisonDecks();
          } else if(target === 'analysis') {
            updateAdvancedAnalysis();
          } else if(target === 'deck-calc') {
            // تبويب Deck Calculator
          } else if(target === 'deck-lists') {
            renderDeckLists();
          } else if(target === 'archive') {
            // تبويب الأرشيف
          }
        } else {
          p.classList.remove('show');
          p.setAttribute('aria-hidden','true');
        }
      });
      
      if(target === 'stats' && pointsChart) {
        setTimeout(async () => {
          if (pointsChart) pointsChart.resize();
        }, 300);
      }
    });
  });
  
  console.log('✅ Event listeners set up');
}

// ==================== بدء التطبيق ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('📄 DOM loaded, setting up auth listener...');
    
    const loginModal = document.getElementById('loginModal');
    const app = document.querySelector('.app');
    
    // Check if we're coming back from OAuth (URL might have tokens)
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthParams = urlParams.has('code') || urlParams.has('error');
    
    if (hasAuthParams) {
        // We're in the middle of OAuth flow, let auth-callback.html handle it
        console.log('🔄 OAuth flow detected, redirecting to callback handler...');
        window.location.href = '/auth-callback.html' + window.location.search;
        return;
    }
    
    // Check for existing session
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting session:', error);
        }
        
        if (session) {
            console.log('✅ Existing session found');
            currentUser = session.user;
            if (loginModal) loginModal.classList.remove('active');
            if (app) app.style.display = 'block';
            await initializeApp();
        } else {
            console.log('❌ No session found');
            if (loginModal) loginModal.classList.add('active');
            if (app) app.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in initial auth check:', error);
        if (loginModal) loginModal.classList.add('active');
        if (app) app.style.display = 'none';
    }
    
    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔐 Auth state changed:', event, session);
        
        if (session) {
            currentUser = session.user;
            if (loginModal) loginModal.classList.remove('active');
            if (app) app.style.display = 'block';
            
            // Only initialize if not already initialized
            if (!window.appInitialized) {
                await initializeApp();
                window.appInitialized = true;
            }
            
            showAlert(`Welcome back, ${session.user.email || 'User'}!`, 'success');
        } else {
            currentUser = null;
            currentSessionId = null;
            allSessions = {};
            window.appInitialized = false;
            if (loginModal) loginModal.classList.add('active');
            if (app) app.style.display = 'none';
        }
    });
    
    initLoginSystem();
});
