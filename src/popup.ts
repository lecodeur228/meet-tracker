interface ParticipantInfo { 
  joinTime: string; 
  leaveTime: string | null; 
  sessions: { start: number, end: number | null }[];
}
interface SharedLink { url: string; text: string; time: string; }

// Fonction pour formater le temps en H:MM:SS
function formatDuration(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) return `${h}h ${m < 10 ? '0' : ''}${m}m`;
    if (m > 0) return `${m}m ${s < 10 ? '0' : ''}${s}s`;
    return `${s}s`;
}

document.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0 || !tabs[0].url) return;
    
    const url = new URL(tabs[0].url);
    const meetingId = url.pathname.substring(1);
    const isMeet = url.hostname === 'meet.google.com' && url.pathname.length > 1;

    // Elements
    const txtStatus = document.getElementById('status-text');
    const dotStatus = document.getElementById('status-dot');
    const pingStatus = document.getElementById('status-ping');
    const countPart = document.getElementById('participant-count');
    const countLinks = document.getElementById('links-count');
    const btnExport = document.getElementById('exportCsv') as HTMLButtonElement;
    
    // Tabs UI
    const tabPart = document.getElementById('tab-participants');
    const tabLinks = document.getElementById('tab-links');
    const viewPart = document.getElementById('view-participants');
    const viewLinks = document.getElementById('view-links');

    if (!isMeet) {
      if (txtStatus) txtStatus.innerText = "NO SIGNAL";
      if (dotStatus) dotStatus.classList.replace('bg-neoW', 'bg-neoPink');
      return;
    }

    if (txtStatus) txtStatus.innerText = meetingId;
    if (dotStatus) dotStatus.classList.replace('bg-neoW', 'bg-neoGreen');
    if (pingStatus) pingStatus.classList.remove('hidden');

    tabPart?.addEventListener('click', () => {
        tabPart.className = "flex-1 py-3 bg-neoPink border-r-4 border-neoB transition-all focus:outline-none";
        tabLinks!.className = "flex-1 py-3 bg-neoW hover:bg-neoYellow transition-all focus:outline-none flex justify-center items-center gap-2";
        viewPart?.classList.remove('hidden');
        viewLinks?.classList.add('hidden');
    });

    tabLinks?.addEventListener('click', () => {
        tabLinks.className = "flex-1 py-3 bg-neoPink transition-all focus:outline-none flex justify-center items-center gap-2";
        tabPart!.className = "flex-1 py-3 bg-neoW hover:bg-neoYellow border-r-4 border-neoB transition-all focus:outline-none";
        viewLinks?.classList.remove('hidden');
        viewPart?.classList.add('hidden');
    });

    const render = () => {
      chrome.storage.local.get(['meetAttendance', 'meetLinks'], (res) => {
        // Render Participants
        const dData = (res.meetAttendance || {})[meetingId] || {};
        const pKeys = Object.keys(dData);
        if (countPart) countPart.innerHTML = `${pKeys.filter(k=>dData[k].leaveTime===null).length} <span class="font-neo text-[14px] text-neoB/50">/ ${pKeys.length}</span>`;
        
        const listEl = document.getElementById('list');
        if (listEl && pKeys.length > 0) {
            listEl.innerHTML = '';
            btnExport.disabled = false;
            for (const [name, times] of Object.entries(dData)) {
                const isOnline = (times as any).leaveTime === null;
                const lv = isOnline ? 'ACTIVE' : (times as any).leaveTime;
                
                const initials = name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase() || 'U';

                // Calcul du temps total
                let totalTimeMs = 0;
                const sessions = (times as any).sessions || [];
                const currentMs = Date.now();
                
                sessions.forEach((s: any) => {
                   if (s.start) {
                     const end = s.end ? s.end : currentMs; // Si en ligne, on compte jusqu'à maintenant
                     totalTimeMs += (end - s.start);
                   }
                });

                const formattedTime = formatDuration(totalTimeMs);
                
                const li = document.createElement('li');
                li.className = `bg-neoW border-4 border-neoB p-3 shadow-neo flex items-center gap-4 relative transition-transform hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${isOnline ? '' : 'opacity-80'}`;
                li.innerHTML = `
                <div class="w-12 h-12 flex-shrink-0 flex items-center justify-center font-display font-extrabold text-[20px] border-2 border-neoB ${isOnline?'bg-neoGreen':'bg-gray-300'} text-neoB">${initials}</div>
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-[14px] uppercase truncate tracking-tight">${name}</div>
                  <div class="flex flex-col gap-1 mt-1 text-[11px] font-bold tracking-widest">
                    <div class="flex gap-2">
                       <span class="bg-neoYellow border-2 border-neoB px-1 py-0.5">IN:${(times as any).joinTime}</span>
                       <span class="${isOnline?'bg-neoPink':'bg-gray-200'} border-2 border-neoB px-1 py-0.5 ${isOnline?'animate-pulse':''}">${isOnline?'🟢':'OUT:'}${lv}</span>
                    </div>
                    <div>
                       <span class="bg-neoB text-neoW border-2 border-neoB px-1 py-0.5 flex gap-1 items-center inline-flex mt-1">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="square" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          ${formattedTime} 
                       </span>
                    </div>
                  </div>
                </div>`;
                listEl.appendChild(li);
            }
        }

        // Render Links
        const lData: SharedLink[] = (res.meetLinks || {})[meetingId] || [];
        if (countLinks) countLinks.innerText = lData.length.toString();
        const linkList = document.getElementById('links-list');
        
        if (linkList && lData.length > 0) {
            linkList.innerHTML = '';
            btnExport.disabled = false;
            lData.reverse().forEach((link) => {
                const li = document.createElement('li');
                li.className = "bg-neoW border-4 border-neoB p-3 shadow-neo hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform";
                li.innerHTML = `
                <div class="flex items-start gap-3 max-w-full">
                    <div class="mt-1 bg-neoYellow border-2 border-neoB w-6 h-6 flex items-center justify-center flex-shrink-0">
                      <svg class="w-4 h-4 text-neoB" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="square" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </div>
                    <div class="flex-1 min-w-0">
                       <a href="${link.url}" target="_blank" class="text-neoBlue hover:text-neoPink hover:underline text-[12px] font-bold break-all block leading-tight" title="${link.url}">${link.url.substring(0, 50)}${link.url.length > 50 ? '...' : ''}</a>
                       <div class="text-[11px] font-bold mt-1 bg-neoB text-neoW px-1 py-0.5 inline-block border-2 border-neoB">${link.time}</div>
                    </div>
                </div>`;
                linkList.appendChild(li);
            });
        }
      });
    };
    
    render();
    setInterval(render, 3000); // Auto-refresh

    // Export Action
    if (btnExport) {
        btnExport.addEventListener('click', () => {
          chrome.storage.local.get(['meetAttendance', 'meetLinks'], (res) => {
            const pData = (res.meetAttendance || {})[meetingId] || {};
            const lData = (res.meetLinks || {})[meetingId] || [];
            
            let csv = "--- PARTICIPANTS ---\nNom,Arrivée,Départ\n";
            for (const [name, times] of Object.entries(pData)) {
              // @ts-ignore
              let leaveStr = times.leaveTime ? times.leaveTime : "En ligne";
              // @ts-ignore
              csv += `"${name.replace(/"/g, '""')}","${times.joinTime}","${leaveStr}"\n`;
            }
            
            csv += "\n--- LIENS PARTAGES ---\nHeure,URL\n";
            lData.forEach((l: SharedLink) => {
                csv += `"${l.time}","${l.url.replace(/"/g, '""')}"\n`;
            });
  
            const a = document.createElement("a");
            a.href = encodeURI("data:text/csv;charset=utf-8," + csv);
            a.download = `Meet_${meetingId}_${new Date().toISOString().slice(0,10)}.csv`;
            a.click();
            
            // Ouvrir l'email pre-rempli
            const body = `Voici un récapitulatif de la réunion Google Meet (${meetingId}).\n\nIl y a eu ${Object.keys(pData).length} participants et ${lData.length} liens partagés.\n\nRetrouvez les détails dans la pièce jointe CSV téléchargée.\n\nCordialement, MeetTracker.`;
            window.location.href = `mailto:?subject=Récapitulatif Google Meet : ${meetingId}&body=${encodeURIComponent(body)}`;
          });
        });
      }
  });
});
