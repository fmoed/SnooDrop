import { navigateTo, context, requestExpandedMode } from '@devvit/web/client';

console.log("SnooDrop Splash script loaded.");

const docsLink = document.getElementById('docs-link') as HTMLDivElement;
const playtestLink = document.getElementById('playtest-link') as HTMLDivElement;
const discordLink = document.getElementById('discord-link') as HTMLDivElement;
const startButton = document.getElementById('start-button') as HTMLButtonElement;
const welcomeText = document.getElementById('welcome-text') as HTMLParagraphElement;

if (startButton) {
  console.log("Start button element found, binding click listener...");
  startButton.addEventListener('click', async (e) => {
    console.log("START DAILY RUN button clicked!", e);
    try {
      console.log("Calling requestExpandedMode with entrypoint: 'game'...");
      await requestExpandedMode(e, 'game');
    } catch (error) {
      console.error("Error during requestExpandedMode:", error);
    }
  });
} else {
  console.error("Start button element NOT found in DOM!");
}

const tabGuide = document.getElementById('tab-guide') as HTMLButtonElement;
const tabLeaderboard = document.getElementById('tab-leaderboard') as HTMLButtonElement;
const guideContent = document.getElementById('guide-content') as HTMLDivElement;
const leaderboardContent = document.getElementById('leaderboard-content') as HTMLDivElement;

tabGuide?.addEventListener('click', () => {
  tabGuide.classList.add('active');
  tabLeaderboard?.classList.remove('active');
  if (guideContent) guideContent.style.display = 'block';
  if (leaderboardContent) leaderboardContent.style.display = 'none';
});

tabLeaderboard?.addEventListener('click', () => {
  tabLeaderboard.classList.add('active');
  tabGuide?.classList.remove('active');
  if (guideContent) guideContent.style.display = 'none';
  if (leaderboardContent) leaderboardContent.style.display = 'block';
});

docsLink?.addEventListener('click', () => {
  navigateTo('https://developers.reddit.com/docs');
});

playtestLink?.addEventListener('click', () => {
  navigateTo('https://www.reddit.com/r/Devvit');
});

discordLink?.addEventListener('click', () => {
  navigateTo('https://discord.com/invite/R7yu2wh9Qz');
});

// Helper to find the highest badge achieved
function getHighestBadge(badges: string[]): { name: string; label: string; class: string } {
  if (badges.includes('🌌 Transcendent Master')) {
    return { name: '🌌 Transcendent Master', label: 'Transcendent', class: 'cosmic' };
  }
  if (badges.includes('🥇 Legendary Merger')) {
    return { name: '🥇 Legendary Merger', label: 'Legendary', class: 'gold' };
  }
  if (badges.includes('🥈 Master Merger')) {
    return { name: '🥈 Master Merger', label: 'Master', class: 'silver' };
  }
  if (badges.includes('🥉 Veteran Merger')) {
    return { name: '🥉 Veteran Merger', label: 'Veteran', class: 'bronze' };
  }
  return { name: '', label: 'No Badges', class: '' };
}

async function loadUserData() {
  const user = context.username ?? 'Merger';
  if (welcomeText) {
    welcomeText.innerHTML = `Welcome <strong>u/${user}</strong>! Ready for today's seed run?`;
  }

  try {
    const res = await fetch('/api/init');
    const data = await res.json();
    if (data.type === 'init') {
      const username = data.username || user;
      if (welcomeText) {
        welcomeText.innerHTML = `Welcome <strong>u/${username}</strong>! Ready for today's seed run?`;
      }

      // 1. Populate Profile Card
      const profileCard = document.getElementById('profile-card') as HTMLDivElement;
      const profileUsername = document.getElementById('profile-username') as HTMLSpanElement;
      const profileActiveBadge = document.getElementById('profile-active-badge') as HTMLSpanElement;
      const profileStreak = document.getElementById('profile-streak') as HTMLSpanElement;
      const profilePb = document.getElementById('profile-pb') as HTMLSpanElement;
      const profileRank = document.getElementById('profile-rank') as HTMLSpanElement;
      const profileAllBadges = document.getElementById('profile-all-badges') as HTMLDivElement;

      if (profileUsername) profileUsername.innerText = `u/${username}`;
      
      const badges = data.unlockedBadges || [];
      const highestBadge = getHighestBadge(badges);
      if (profileActiveBadge) {
        profileActiveBadge.innerText = highestBadge.label;
        profileActiveBadge.className = 'profile-active-badge';
        if (highestBadge.class) {
          profileActiveBadge.classList.add(highestBadge.class);
        }
      }

      if (profileStreak) {
        profileStreak.innerText = data.top10Streak ? `${data.top10Streak}d` : '0d';
      }

      if (profilePb) {
        profilePb.innerText = data.highScore ? data.highScore.toLocaleString() : '0';
      }

      if (profileRank) {
        if (data.rank) {
          profileRank.innerText = `#${data.rank}`;
        } else if (data.percentile) {
          profileRank.innerText = `Top ${data.percentile}%`;
        } else {
          profileRank.innerText = '-';
        }
      }

      // Display all badges
      if (profileAllBadges) {
        profileAllBadges.innerHTML = '';
        if (badges.length > 0) {
          badges.forEach((name: string) => {
            const emoji = name.split(' ')[0] || '🏅';
            const badgeClass = name.includes('Transcendent') ? 'cosmic' : 
                               name.includes('Legendary') ? 'gold' : 
                               name.includes('Master') ? 'silver' : 'bronze';
            
            const badgeEl = document.createElement('div');
            badgeEl.className = `badge-item ${badgeClass}`;
            badgeEl.title = name;
            badgeEl.innerText = emoji;
            profileAllBadges.appendChild(badgeEl);
          });
          profileAllBadges.style.display = 'flex';
        } else {
          profileAllBadges.style.display = 'none';
        }
      }

      if (profileCard) {
        profileCard.style.display = 'flex';
      }

      // 2. Leaderboards & Filter Bindings
      const filterDaily = document.getElementById('filter-daily') as HTMLButtonElement;
      const filterStreaks = document.getElementById('filter-streaks') as HTMLButtonElement;
      const filterGlobal = document.getElementById('filter-global') as HTMLButtonElement;
      const lobbyLeaderboardList = document.getElementById('lobby-leaderboard-list') as HTMLDivElement;
      const myStandingFooter = document.getElementById('my-standing-footer') as HTMLDivElement;
      const standingTitle = document.getElementById('standing-title') as HTMLSpanElement;
      const standingDetails = document.getElementById('standing-details') as HTMLSpanElement;

      let currentFilter: 'daily' | 'streaks' | 'global' = 'daily';

      const renderLeaderboard = () => {
        if (!lobbyLeaderboardList) return;
        lobbyLeaderboardList.innerHTML = '';

        let listHtml = '';
        
        if (currentFilter === 'daily') {
          const list = data.leaderboard || [];
          if (list.length === 0) {
            listHtml = '<div class="leaderboard-loading">No scores today. Be the first!</div>';
          } else {
            list.forEach((entry: { username: string; score: number; top10Streak?: number }, index: number) => {
              const rankClass = index === 0 ? 'gold-rank' : index === 1 ? 'silver-rank' : index === 2 ? 'bronze-rank' : '';
              const rankText = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
              const highlight = entry.username === username ? 'highlight-me' : '';
              
              listHtml += `
                <div class="lobby-leaderboard-item ${highlight}">
                  <div class="lobby-rank-name">
                    <span class="lobby-rank ${rankClass}">${rankText}</span>
                    <span class="lobby-name">u/${entry.username}</span>
                  </div>
                  <div class="lobby-score-streak">
                    <span class="lobby-score">${entry.score.toLocaleString()}</span>
                    ${entry.top10Streak && entry.top10Streak > 0 ? `<span class="lobby-streak">🔥 ${entry.top10Streak}d</span>` : ''}
                  </div>
                </div>
              `;
            });
          }
          
          // Standing
          if (myStandingFooter && standingTitle && standingDetails) {
            standingTitle.innerText = data.dailyRank ? `Today Rank: #${data.dailyRank}` : 'Today Rank: Unranked';
            standingDetails.innerText = `Score: ${data.dailyScore ? data.dailyScore.toLocaleString() : 0} | Streak: ${data.top10Streak || 0}d`;
            myStandingFooter.style.display = 'flex';
          }
        } 
        else if (currentFilter === 'streaks') {
          const list = data.streakLeaderboard || [];
          if (list.length === 0) {
            listHtml = '<div class="leaderboard-loading">No active streaks. Play to start one!</div>';
          } else {
            list.forEach((entry: { username: string; streak: number }, index: number) => {
              const rankClass = index === 0 ? 'gold-rank' : index === 1 ? 'silver-rank' : index === 2 ? 'bronze-rank' : '';
              const rankText = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
              const highlight = entry.username === username ? 'highlight-me' : '';
              
              listHtml += `
                <div class="lobby-leaderboard-item ${highlight}">
                  <div class="lobby-rank-name">
                    <span class="lobby-rank ${rankClass}">${rankText}</span>
                    <span class="lobby-name">u/${entry.username}</span>
                  </div>
                  <div class="lobby-score-streak">
                    <span class="lobby-streak">🔥 ${entry.streak} Days</span>
                  </div>
                </div>
              `;
            });
          }

          // Standing
          if (myStandingFooter && standingTitle && standingDetails) {
            standingTitle.innerText = data.streakRank ? `Streak Rank: #${data.streakRank}` : 'Streak Rank: Unranked';
            standingDetails.innerText = `Streak: ${data.top10Streak || 0}d | PB: ${data.highScore ? data.highScore.toLocaleString() : 0}`;
            myStandingFooter.style.display = 'flex';
          }
        } 
        else if (currentFilter === 'global') {
          const list = data.globalLeaderboard || [];
          if (list.length === 0) {
            listHtml = '<div class="leaderboard-loading">No global entries. Submit a score!</div>';
          } else {
            list.forEach((entry: { username: string; score: number; top10Streak?: number }, index: number) => {
              const rankClass = index === 0 ? 'gold-rank' : index === 1 ? 'silver-rank' : index === 2 ? 'bronze-rank' : '';
              const rankText = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
              const highlight = entry.username === username ? 'highlight-me' : '';
              
              listHtml += `
                <div class="lobby-leaderboard-item ${highlight}">
                  <div class="lobby-rank-name">
                    <span class="lobby-rank ${rankClass}">${rankText}</span>
                    <span class="lobby-name">u/${entry.username}</span>
                  </div>
                  <div class="lobby-score-streak">
                    <span class="lobby-score">${entry.score.toLocaleString()}</span>
                    ${entry.top10Streak && entry.top10Streak > 0 ? `<span class="lobby-streak">🔥 ${entry.top10Streak}d</span>` : ''}
                  </div>
                </div>
              `;
            });
          }

          // Standing
          if (myStandingFooter && standingTitle && standingDetails) {
            if (data.rank) {
              standingTitle.innerText = `Global Rank: #${data.rank}`;
            } else if (data.percentile) {
              standingTitle.innerText = `Global Rank: Top ${data.percentile}%`;
            } else {
              standingTitle.innerText = 'Global Rank: Unranked';
            }
            standingDetails.innerText = `Personal Best: ${data.highScore ? data.highScore.toLocaleString() : 0}`;
            myStandingFooter.style.display = 'flex';
          }
        }

        lobbyLeaderboardList.innerHTML = listHtml;
      };

      // Set initial
      renderLeaderboard();

      // Click bindings for filters
      filterDaily?.addEventListener('click', () => {
        currentFilter = 'daily';
        filterDaily.classList.add('active');
        filterStreaks?.classList.remove('active');
        filterGlobal?.classList.remove('active');
        renderLeaderboard();
      });

      filterStreaks?.addEventListener('click', () => {
        currentFilter = 'streaks';
        filterStreaks.classList.add('active');
        filterDaily?.classList.remove('active');
        filterGlobal?.classList.remove('active');
        renderLeaderboard();
      });

      filterGlobal?.addEventListener('click', () => {
        currentFilter = 'global';
        filterGlobal.classList.add('active');
        filterDaily?.classList.remove('active');
        filterStreaks?.classList.remove('active');
        renderLeaderboard();
      });
    }
  } catch (error) {
    console.error("Failed to load user data on splash:", error);
  }
}

loadUserData().catch(err => console.error("loadUserData failed:", err));

// Auto-expand game window when clicking anywhere on the lobby card / page
document.body.addEventListener('click', async (e) => {
  const target = e.target as HTMLElement;
  // Skip if clicking buttons, tabs, links, filters, or footer items
  if (
    target.id === 'start-button' ||
    target.id === 'tab-guide' ||
    target.id === 'tab-leaderboard' ||
    target.id === 'filter-daily' ||
    target.id === 'filter-streaks' ||
    target.id === 'filter-global' ||
    target.closest('.docs-link') ||
    target.closest('.tab-btn') ||
    target.closest('.filter-btn') ||
    target.closest('.badge-item')
  ) {
    return;
  }

  console.log("Global window click detected, requesting expanded view popup...");
  try {
    await requestExpandedMode(e, 'game');
  } catch (err) {
    console.warn("Failed to expand view on click:", err);
  }
});
