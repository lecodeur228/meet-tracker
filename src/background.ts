interface ParticipantInfo {
  joinTime: string;
  leaveTime: string | null;
}
interface SharedLink {
  url: string;
  text: string;
  time: string;
}
interface Message {
  action: string;
  meetingId: string;
  data: any;
}

chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  if (message.action === 'save_attendance') {
    chrome.storage.local.get(['meetAttendance'], (result) => {
      const data = result.meetAttendance || {};
      const meetingId = message.meetingId;
      if (!data[meetingId]) data[meetingId] = {};

      for (const [name, info] of Object.entries(message.data as Record<string, ParticipantInfo>)) {
        if (!data[meetingId][name]) data[meetingId][name] = info;
        else data[meetingId][name].leaveTime = info.leaveTime;
      }
      chrome.storage.local.set({ meetAttendance: data });
    });
  } else if (message.action === 'save_links') {
    chrome.storage.local.get(['meetLinks'], (result) => {
      const data = result.meetLinks || {};
      const meetingId = message.meetingId;
      if (!data[meetingId]) data[meetingId] = [];

      // Fusion des anciens et nouveaux liens
      const existingUrls = new Set(data[meetingId].map((l: SharedLink) => l.url));
      const newLinks = message.data.filter((l: SharedLink) => !existingUrls.has(l.url));
      
      if (newLinks.length > 0) {
        data[meetingId] = [...data[meetingId], ...newLinks];
        chrome.storage.local.set({ meetLinks: data });
      }
    });
  }
});
