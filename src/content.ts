interface ParticipantInfo {
  joinTime: string;
  leaveTime: string | null;
}

let isTracking = false;
let participants: Record<string, ParticipantInfo> = {};
let sharedLinks = new Map<string, {url: string, text: string, time: string}>();
let meetingId = window.location.pathname.substring(1);
let intervalId: any = null;
let isExtensionValid = true;

// Fonction sécurisée pour envoyer un message sans crasher si l'extension a été rechargée
function safeSendMessage(message: any) {
  if (!isExtensionValid) return;
  try {
    // Si chrome.runtime n'est plus accessible (Extension context invalidated)
    // Cela lèvera une exception immédiate qu'on attrape ici.
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        // Ignorer l'erreur de port fermé
      }
    });
  } catch (e) {
    isExtensionValid = false;
    stopScan();
    console.warn("[Meet Tracker] Contexte de l'extension invalidé. La page doit être rechargée.");
    alert("⚠️ L'extension Meet Tracker a été mise à jour ! Veuillez recharger la page (F5) pour continuer l'enregistrement.");
    
    const widget = document.getElementById('meet-tracker-widget');
    if (widget) widget.remove();
  }
}

function injectFloatingButton() {
  if (document.getElementById('meet-tracker-widget') || !isExtensionValid) return;

  const container = document.createElement('div');
  container.id = 'meet-tracker-widget';
  container.style.cssText = `
    position: fixed;
    bottom: 90px;
    left: 20px;
    z-index: 999999;
    background: #fff;
    border: 1px solid #dadce0;
    padding: 10px 16px;
    border-radius: 20px;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    font-family: "Google Sans", Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    color: #3c4043;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  const icon = document.createElement('span');
  icon.innerHTML = '🚀';
  
  const text = document.createElement('span');
  text.innerText = 'Démarrer Meet Tracker';

  container.appendChild(icon);
  container.appendChild(text);

  container.addEventListener('mouseenter', () => container.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)');
  container.addEventListener('mouseleave', () => container.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)');

  container.addEventListener('click', () => {
    isTracking = !isTracking;
    if (isTracking) {
      container.style.borderColor = '#34A853';
      container.style.background = '#e6f4ea';
      icon.innerHTML = '🟢';
      text.innerText = 'Tracker Actif (Ouvrez la liste des participants !)';
      text.style.color = '#137333';
      startScan();
    } else {
      container.style.borderColor = '#dadce0';
      container.style.background = '#fff';
      icon.innerHTML = '⏸️';
      text.innerText = 'Tracker en Pause';
      text.style.color = '#3c4043';
      stopScan();
    }
  });

  document.body.appendChild(container);
}

function startScan() {
  console.log("[Meet Tracker] Démarrage du scan...");
  if (intervalId) clearInterval(intervalId);
  
  intervalId = setInterval(() => {
    if (!isExtensionValid) {
        stopScan();
        return;
    }
    trackParticipants();
    trackLinks();
  }, 3000);
}

function stopScan() {
  if (intervalId) clearInterval(intervalId);
  console.log("[Meet Tracker] Pause du scan.");
}

function trackParticipants() {
  if (!isTracking || !isExtensionValid) return;

  const currentParticipants = new Set<string>();
  const now = new Date().toLocaleTimeString();

  const nameSelectors = [
    '[data-self-name]', 
    '[data-participant-id]', 
    '.zWGUib', 
    '[role="listitem"]'
  ];

  document.querySelectorAll(nameSelectors.join(', ')).forEach(el => {
    let text = (el as HTMLElement).innerText || (el as HTMLElement).textContent || '';
    if (text) {
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        let name = lines[0];
        name = name.replace(/\(Vous\)/i, '').replace(/\(You\)/i, '').trim();
        if (name && name.length > 1 && !['Épingler', 'Pin', 'Couper le micro', 'Mute'].includes(name) && !name.includes(':') && name !== 'Sondages' && name !== 'Q&A') {
            currentParticipants.add(name);
        }
      }
    }
  });

  if (currentParticipants.size === 0) {
      currentParticipants.add("Créateur (Vous)");
  }

  currentParticipants.forEach(name => {
    if (!participants[name]) {
      participants[name] = { joinTime: now, leaveTime: null };
      console.log(`[Meet Tracker] NOUVEAU : ${name} a rejoint à ${now}`);
    } else if (participants[name].leaveTime !== null) {
      participants[name].leaveTime = null; 
    }
  });

  for (const name in participants) {
    if (!currentParticipants.has(name) && participants[name].leaveTime === null) {
      participants[name].leaveTime = now;
      console.log(`[Meet Tracker] DÉPART : ${name} est parti à ${now}`);
    }
  }

  safeSendMessage({
    action: 'save_attendance',
    meetingId: meetingId,
    data: participants
  });
}

function trackLinks() {
  if (!isTracking || !isExtensionValid) return;

  const linkElements = document.querySelectorAll('a[href^="http"]');
  let hasNew = false;
  const now = new Date().toLocaleTimeString();

  linkElements.forEach(el => {
    const href = (el as HTMLAnchorElement).href;
    const text = el.textContent || href;
    
    if (!href.includes('meet.google.com') && !href.includes('myaccount.google.com') && !href.includes('support.google.com')) {
      if (!sharedLinks.has(href)) {
         sharedLinks.set(href, { url: href, text: text, time: now });
         hasNew = true;
      }
    }
  });

  if (hasNew) {
    safeSendMessage({
        action: 'save_links',
        meetingId: meetingId,
        data: Array.from(sharedLinks.values())
    });
  }
}

window.addEventListener('load', () => {
    if (meetingId && meetingId.length > 5) {
        setTimeout(() => {
            if (isExtensionValid) injectFloatingButton();
        }, 3000);
    }
});
