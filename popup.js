import { supabase } from './supabaseClient.js'

const emailInput = document.getElementById('email')
const passwordInput = document.getElementById('password')
const loginBtn = document.getElementById('login-btn')
const signupBtn = document.getElementById('signup-btn')
const logoutBtn = document.getElementById('logout-btn')
const resendBtn = document.getElementById('resend-btn')
const authSection = document.getElementById('auth-section')
const successSection = document.getElementById('success-section')
const userEmail = document.getElementById('user-email')
const statusMsg = document.getElementById('status-msg')

function showStatus(msg, isError = false) {
  statusMsg.textContent = msg
  statusMsg.style.color = isError ? '#f55' : '#4f8ef7'
}

function showSuccess(session) {
  authSection.style.display = 'none'
  successSection.style.display = 'block'
  userEmail.textContent = session.user.email
}

function showLogin() {
  authSection.style.display = 'block'
  successSection.style.display = 'none'
  resendBtn.style.display = 'none'
  showStatus('')
}

// 팝업 열릴 때 세션 확인
chrome.storage.local.get(['session'], (result) => {
  if (result.session) {
    showSuccess(result.session)
  }
})

// 로그인
loginBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  if (!email || !password)
    return showStatus('이메일과 비밀번호를 입력해주세요.', true)

  showStatus('로그인 중...')
  resendBtn.style.display = 'none'

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return showStatus(error.message, true)

  // 이메일 인증 여부 확인
  if (!data.user || !data.user.email_confirmed_at) {
    // 인증되지 않은 경우 세션 저장하지 않고 차단
    await supabase.auth.signOut()
    resendBtn.style.display = 'block'
    resendBtn.dataset.email = email
    return showStatus('이메일 인증이 필요합니다. 받은 메일함을 확인해주세요.', true)
  }

  chrome.storage.local.set({ session: data.session }, () => {
    showSuccess(data.session)
  })
})

// 회원가입
signupBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()
  if (!email || !password)
    return showStatus('이메일과 비밀번호를 입력해주세요.', true)

  showStatus('회원가입 중...')
  resendBtn.style.display = 'none'

  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return showStatus(error.message, true)

  // 회원가입 후 세션 여부와 무관하게 항상 이메일 인증 안내
  resendBtn.style.display = 'block'
  resendBtn.dataset.email = email
  showStatus('✉️ 인증 메일을 발송했습니다. 이메일을 확인 후 로그인해주세요.')
})

// 인증 메일 재전송
resendBtn.addEventListener('click', async () => {
  const email = resendBtn.dataset.email || emailInput.value.trim()
  if (!email) return showStatus('이메일을 입력해주세요.', true)

  showStatus('재전송 중...')
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email,
  })

  if (error) return showStatus(error.message, true)
  showStatus('✉️ 인증 메일을 재전송했습니다. 메일함을 확인해주세요.')
})

// 로그아웃
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
  chrome.storage.local.remove(['session'], () => {
    showLogin()
  })
})
