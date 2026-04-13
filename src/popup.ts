interface ParticipantInfo { joinTime: string; leaveTime: string | null; }
interface SharedLink { url: string; text: string; time: string; }

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
      if (txtStatus) txtStatus.innerText = "Hors réunion Meet";
      if (dotStatus) dotStatus.classList.replace('bg-[#dadce0]', 'bg-[#ea4335]');
      return;
    }

    if (txtStatus) txtStatus.innerText = `ID: ${meetingId}`;
    if (dotStatus) dotStatus.classList.replace('bg-[#dadce0]', 'bg-[#34A853]');
    if (pingStatus) pingStatus.classList.remove('hidden');

    tabPart?.addEventListener('click', () => {
        tabPart.className = "flex-1 py-3 text-[#1a73e8] border-b-2 border-[#1a73e8] transition-colors focus:outline-none";
        tabLinks!.className = "flex-1 py-3 text-[#5f6368] border-b-2 border-transparent hover:text-[#202124] transition-colors focus:outline-none";
        viewPart?.classList.remove('hidden');
        viewLinks?.classList.add('hidden');
    });

    tabLinks?.addEventListener('click', () => {
        tabLinks.className = "flex-1 py-3 text-[#1a73e8] border-b-2 border-[#1a73e8] transition-colors focus:outline-none";
        tabPart!.className = "flex-1 py-3 text-[#5f6368] border-b-2 border-transparent hover:text-[#202124] transition-colors focus:outline-none";
        viewLinks?.classList.remove('hidden');
        viewPart?.classList.add('hidden');
    });

    const render = () => {
      chrome.storage.local.get(['meetAttendance', 'meetLinks'], (res) => {
        // Render Participants
        const dData = (res.meetAttendance || {})[meetingId] || {};
        const pKeys = Object.keys(dData);
        if (countPart) countPart.innerHTML = `${pKeys.filter(k=>dData[k].leaveTime===null).length} <span class="font-normal text-[#5f6368]">/ ${pKeys.length}</span>`;
        
        const listEl = document.getElementById('list');
        if (listEl && pKeys.length > 0) {
            listEl.innerHTML = '';
            btnExport.disabled = false;
            for (const [name, times] of Object.entries(dData)) {
                // @ts-ignore
                const isOnline = times.leaveTime === null;
                // @ts-ignore
                const lv = isOnline ? '<span class="text-[#34A853] font-bold text-[12px]">En ligne</span>' : times.leaveTime;
                const words = name.split(' ').filter(n=>n.length>0);
                const initials = words.length>=2 ? (words[0][0]+words[1][0]).toUpperCase() : (words[0] ? words[0].substring(0,2).toUpperCase() : 'U');
                
                const li = document.createElement('li');
                li.className = "bg-white border border-[#e8eaed] rounded-lg p-3 shadow-sm flex items-start gap-3 relative";
                li.innerHTML = `
                <div class="absolute left-0 top-0 bottom-0 w-[3px] ${isOnline?'bg-[#34A853]':'bg-[#9aa0a6]'} rounded-l-lg"></div>
                <div class="flex-shrink-0 h-9 w-9 mt-0.5 rounded-full ${isOnline?'bg-[#e6f4ea] text-[#137333]':'bg-[#f1f3f4] text-[#5f6368]'} flex items-center justify-center font-bold ml-1 text-[13px]">${initials}</div>
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-[#202124] truncate">${name}</div>
                  <div class="flex gap-3 mt-1 text-[11px] text-[#5f6368]">
                    <span><span class="w-1.5 h-1.5 inline-block rounded-full bg-[#fbbc04] mr-1"></span><b>${(times as any).joinTime}</b></span>
                    <span><span class="w-1.5 h-1.5 inline-block rounded-full ${isOnline?'bg-[#34A853]':'bg-[#ea4335]'} mr-1"></span>${lv}</span>
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
                li.className = "bg-white border border-[#e8eaed] rounded-lg p-3 shadow-sm hover:shadow transition-all duration-200";
                li.innerHTML = `
                <div class="flex items-start gap-2 max-w-full">
                    <svg class="w-4 h-4 text-[#1a73e8] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                    <div class="flex-1 min-w-0">
                       <a href="${link.url}" target="_blank" class="text-[#1a73e8] hover:underline text-[13px] font-medium break-all block" title="${link.url}">${link.url.substring(0, 45)}${link.url.length > 45 ? '...' : ''}</a>
                       <div class="text-[11px] text-[#5f6368] mt-1">${link.time}</div>
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
