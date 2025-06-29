const API_KEY = 'f4aca603dbeb00cb9fe13d98fe56af1f'; // Replace with your actual API key

document.addEventListener('DOMContentLoaded', function() {
  const titleInput = document.getElementById('titleInput');
  const addBtn = document.getElementById('addBtn');
  const watchlistDiv = document.getElementById('watchlist');

  loadWatchlist();

  addBtn.addEventListener('click', function() {
    const title = titleInput.value.trim();
    if (title) {
      addToWatchlist(title);
      titleInput.value = '';
    }
  });

  let searchTimeout;
  titleInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const query = this.value.trim();
    
    if (query.length > 2) {
      searchTimeout = setTimeout(() => searchTMDB(query), 300);
    } else {
      hideSearchResults();
    }
  });

  titleInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstResult = document.querySelector('.search-result');
      if (firstResult) {
        firstResult.click();
      }
    }
  });
});

function addToWatchlist(title) {
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const newItem = {
      id: Date.now(),
      title: title,
      currentSeason: 1,
      currentEpisode: 1,
      type: 'tv',
      progress: null,
      posterPath: null
    };
    watchlist.push(newItem);
    chrome.storage.local.set({watchlist: watchlist}, function() {
      loadWatchlist();
    });
  });
}

function addToWatchlistWithDetails(title, type, tmdbId, posterPath = null) {
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const newItem = {
      id: Date.now(),
      title: title,
      currentSeason: type === 'movie' ? null : 1,
      currentEpisode: type === 'movie' ? null : 1,
      currentEpisodeTitle: null,
      type: type,
      tmdbId: tmdbId,
      progress: type === 'movie' ? '0:00:00' : null,
      posterPath: posterPath
    };
    watchlist.push(newItem);
    chrome.storage.local.set({watchlist: watchlist}, function() {
      loadWatchlist();
    });
  });
}

function loadWatchlist() {
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    displayWatchlist(watchlist);
  });
}

function displayWatchlist(watchlist) {
  const watchlistDiv = document.getElementById('watchlist');
  watchlistDiv.innerHTML = '';
  
  watchlist.forEach(item => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'watchlist-item';
    
    if (item.type === 'movie') {
      itemDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 50px; height: 75px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: linear-gradient(45deg, #667eea, #764ba2);">
            ${item.posterPath ? `<img src="https://image.tmdb.org/t/p/w92${item.posterPath}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px; color: white;">${item.title}</div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.7);">Progress: ${item.progress || '0:00:00'}</div>
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="edit-progress-btn" data-id="${item.id}" style="flex: 1; padding: 10px 16px; background: linear-gradient(45deg, #667eea, #764ba2); border: none; border-radius: 10px; color: white; font-weight: 500; font-size: 13px; cursor: pointer;">Edit Progress</button>
          <button class="remove-btn" data-id="${item.id}" style="padding: 10px 16px; background: linear-gradient(45deg, #ff6b6b, #ee5a52); border: none; border-radius: 10px; color: white; font-weight: 500; font-size: 13px; cursor: pointer;">Remove</button>
        </div>
      `;
    } else {
      itemDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <div style="width: 50px; height: 75px; border-radius: 8px; overflow: hidden; flex-shrink: 0; background: linear-gradient(45deg, #f093fb, #f5576c);">
            ${item.posterPath ? `<img src="https://image.tmdb.org/t/p/w92${item.posterPath}" alt="${item.title}" style="width: 100%; height: 100%; object-fit: cover;">` : ''}
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px; color: white;">${item.title}</div>
            <div style="font-size: 13px; color: rgba(255,255,255,0.7);">Season ${item.currentSeason || 1}, Episode ${item.currentEpisode || 1}</div>
            ${item.currentEpisodeTitle ? `<div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 2px;">"${item.currentEpisodeTitle}"</div>` : ''}
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="edit-progress-btn" data-id="${item.id}" style="flex: 1; padding: 10px 16px; background: linear-gradient(45deg, #f093fb, #f5576c); border: none; border-radius: 10px; color: white; font-weight: 500; font-size: 13px; cursor: pointer;">Edit Progress</button>
          <button class="remove-btn" data-id="${item.id}" style="padding: 10px 16px; background: linear-gradient(45deg, #ff6b6b, #ee5a52); border: none; border-radius: 10px; color: white; font-weight: 500; font-size: 13px; cursor: pointer;">Remove</button>
        </div>
      `;
    }
    
    watchlistDiv.appendChild(itemDiv);
  });

  addEventListeners();
}

function addEventListeners() {
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => removeItem(parseInt(e.target.dataset.id)));
  });

  document.querySelectorAll('.edit-progress-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = parseInt(e.target.dataset.id);
      chrome.storage.local.get(['watchlist'], function(result) {
        const watchlist = result.watchlist || [];
        const item = watchlist.find(item => item.id === itemId);
        if (item && item.type === 'movie') {
          showProgressModal(itemId);
        } else if (item && item.type === 'tv') {
          showTVProgressModal(itemId);
        }
      });
    });
  });
}

function updateEpisode(id, change) {
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const item = watchlist.find(item => item.id === id);
    if (item) {
      item.currentEpisode = Math.max(1, item.currentEpisode + change);
      chrome.storage.local.set({watchlist: watchlist}, function() {
        loadWatchlist();
      });
    }
  });
}

function updateSeason(id, change) {
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const item = watchlist.find(item => item.id === id);
    if (item) {
      item.currentSeason = Math.max(1, (item.currentSeason || 1) + change);
      chrome.storage.local.set({watchlist: watchlist}, function() {
        loadWatchlist();
      });
    }
  });
}

function removeItem(id) {
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const updatedList = watchlist.filter(item => item.id !== id);
    chrome.storage.local.set({watchlist: updatedList}, function() {
      loadWatchlist();
    });
  });
}

function editEpisode(id, newEpisode) {
  const episodeNum = parseInt(newEpisode);
  if (isNaN(episodeNum) || episodeNum < 1) return;
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const item = watchlist.find(item => item.id === id);
    if (item) {
      item.currentEpisode = episodeNum;
      chrome.storage.local.set({watchlist: watchlist}, function() {
        loadWatchlist();
      });
    }
  });
}

function editSeason(id, newSeason) {
  const seasonNum = parseInt(newSeason);
  if (isNaN(seasonNum) || seasonNum < 1) return;
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const item = watchlist.find(item => item.id === id);
    if (item) {
      item.currentSeason = seasonNum;
      chrome.storage.local.set({watchlist: watchlist}, function() {
        loadWatchlist();
      });
    }
  });
}

function searchTMDB(query) {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        displaySearchResults(data.results.slice(0, 5));
      } else {
        hideSearchResults();
      }
    })
    .catch(error => {
      console.error('Search error:', error);
      hideSearchResults();
    });
}

function getEpisodeDetails(tmdbId, season, episode, callback) {
  if (!tmdbId || !season || !episode) {
    callback(null);
    return;
  }
  const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${API_KEY}`;
  fetch(url)
    .then(response => {
      if (!response.ok) return null;
      return response.json();
    })
    .then(data => callback(data))
    .catch(error => {
      console.error('Error fetching episode details:', error);
      callback(null);
    });
}

function displaySearchResults(results) {
  hideSearchResults();
  
  const searchDiv = document.createElement('div');
  searchDiv.id = 'searchResults';
  searchDiv.style.cssText = `
    position: absolute;
    top: 52px;
    left: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.95);
    border-radius: 12px;
    max-height: 280px;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 9999;
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(20px);
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
    transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
  `;
  
  document.querySelector('.search-container').appendChild(searchDiv);
  
  searchDiv.innerHTML = results.map(item => {
    const posterUrl = item.poster_path 
      ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
      : null;
    
    return `
      <div class="search-result" data-id="${item.id}" data-type="${item.media_type}" data-poster="${item.poster_path || ''}" style="
        padding: 16px;
        cursor: pointer;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        transition: all 0.2s cubic-bezier(0.4, 0.0, 0.2, 1);
        color: white;
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <div style="
          width: 50px;
          height: 75px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: ${item.media_type === 'movie' ? 'linear-gradient(45deg, #667eea, #764ba2)' : 'linear-gradient(45deg, #f093fb, #f5576c)'};
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: 500;
          text-align: center;
          padding: 4px;
        ">
          ${posterUrl ? `<img src="${posterUrl}" alt="${item.title || item.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentNode.innerHTML='${(item.title || item.name).substring(0, 15)}${(item.title || item.name).length > 15 ? '...' : ''}';">` : (item.title || item.name).substring(0, 15) + ((item.title || item.name).length > 15 ? '...' : '')}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div class="search-result-title" style="font-weight: 500; margin-bottom: 4px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.title || item.name}</div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.6);">
            ${item.media_type === 'movie' ? 'Movie' : 'TV Show'} ${item.release_date || item.first_air_date ? '• ' + (item.release_date || item.first_air_date).split('-')[0] : ''}
          </div>
          ${item.overview ? `<div style="font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 4px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.overview}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Animate in
  setTimeout(() => {
    searchDiv.style.opacity = '1';
    searchDiv.style.transform = 'translateY(0) scale(1)';
  }, 10);
  
  // Add interactions
  document.querySelectorAll('.search-result').forEach(result => {
    result.addEventListener('mouseenter', function() {
      this.style.background = 'rgba(255,255,255,0.08)';
      this.style.transform = 'translateX(4px)';
    });
    
    result.addEventListener('mouseleave', function() {
      this.style.background = 'transparent';
      this.style.transform = 'translateX(0)';
    });
    
    result.addEventListener('click', function() {
		const title = this.querySelector('.search-result-title').textContent;
		const type = this.dataset.type;
		const id = this.dataset.id;
		const posterPath = this.dataset.poster;
  
		addToWatchlistWithDetails(title, type, id, posterPath);
		document.getElementById('titleInput').value = '';
		hideSearchResults();
	});
  });
}

function hideSearchResults() {
  const searchDiv = document.getElementById('searchResults');
  if (searchDiv) {
    searchDiv.style.opacity = '0';
    searchDiv.style.transform = 'translateY(-10px) scale(0.95)';
    setTimeout(() => searchDiv.remove(), 300);
  }
}

function showProgressModal(itemId) {
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const item = watchlist.find(item => item.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.id = 'progressModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    const currentTime = item.progress ? item.progress.split(':') : ['0', '00', '00'];
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        padding: 24px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transform: scale(0.9);
        transition: transform 0.3s ease;
      ">
        <h3 style="margin-bottom: 16px; text-align: center; color: white;">Edit Progress</h3>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px;">
          <input type="number" id="hours" min="0" max="23" value="${currentTime[0]}" style="width: 60px; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.2); color: white; text-align: center;">
          <span style="color: white;">:</span>
          <input type="number" id="minutes" min="0" max="59" value="${currentTime[1]}" style="width: 60px; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.2); color: white; text-align: center;">
          <span style="color: white;">:</span>
          <input type="number" id="seconds" min="0" max="59" value="${currentTime[2]}" style="width: 60px; padding: 8px; border: none; border-radius: 8px; background: rgba(255,255,255,0.2); color: white; text-align: center;">
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="saveProgress" style="flex: 1; padding: 10px; background: linear-gradient(45deg, #667eea, #764ba2); border: none; border-radius: 8px; color: white; cursor: pointer;">Save</button>
          <button id="cancelProgress" style="flex: 1; padding: 10px; background: rgba(255, 255, 255, 0.2); border: none; border-radius: 8px; color: white; cursor: pointer;">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.querySelector('div').style.transform = 'scale(1)';
    }, 10);
    
    document.getElementById('saveProgress').addEventListener('click', () => {
      const hours = document.getElementById('hours').value.padStart(1, '0');
      const minutes = document.getElementById('minutes').value.padStart(2, '0');
      const seconds = document.getElementById('seconds').value.padStart(2, '0');
      
      item.progress = `${hours}:${minutes}:${seconds}`;
      chrome.storage.local.set({watchlist: watchlist}, function() {
        loadWatchlist();
        closeProgressModal();
      });
    });
    
    document.getElementById('cancelProgress').addEventListener('click', closeProgressModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeProgressModal();
    });
  });
}

function closeProgressModal() {

	
  const modal = document.getElementById('progressModal');
  if (modal) {
    modal.style.opacity = '0';
    modal.querySelector('div').style.transform = 'scale(0.9)';
    setTimeout(() => modal.remove(), 300);
  }
}

function showTVProgressModal(itemId) {
  chrome.storage.local.get(['watchlist'], function(result) {
    const watchlist = result.watchlist || [];
    const item = watchlist.find(item => item.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.id = 'tvProgressModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      transition: all 0.3s ease;
    `;
    
    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        padding: 24px;
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        transform: scale(0.9);
        transition: transform 0.3s ease;
        min-width: 320px;
        max-width: 400px;
      ">
        <h3 style="margin-bottom: 20px; text-align: center; color: white; font-weight: 600;">${item.title}</h3>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; color: rgba(255,255,255,0.8); margin-bottom: 8px; font-size: 13px;">Season & Episode</label>
          <div style="display: flex; gap: 12px;">
            <div style="flex: 1;">
              <input type="number" id="tvSeason" min="1" value="${item.currentSeason || 1}" placeholder="Season" style="
                width: 100%;
                padding: 12px;
                border: none;
                border-radius: 10px;
                background: rgba(255,255,255,0.15);
                color: white;
                text-align: center;
                font-size: 14px;
              ">
            </div>
            <div style="flex: 1;">
              <input type="number" id="tvEpisode" min="1" value="${item.currentEpisode || 1}" placeholder="Episode" style="
                width: 100%;
                padding: 12px;
                border: none;
                border-radius: 10px;
                background: rgba(255,255,255,0.15);
                color: white;
                text-align: center;
                font-size: 14px;
              ">
            </div>
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; color: rgba(255,255,255,0.8); margin-bottom: 8px; font-size: 13px;">Or search by episode name</label>
          <input type="text" id="episodeSearch" placeholder="Type episode name..." style="
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 10px;
            background: rgba(255,255,255,0.15);
            color: white;
            font-size: 14px;
            margin-bottom: 8px;
          ">
          <div id="episodeResults" style="
            max-height: 150px;
            overflow-y: auto;
            border-radius: 8px;
            background: rgba(0,0,0,0.3);
            display: none;
          "></div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button id="saveTVProgress" style="
            flex: 1;
            padding: 12px;
            background: linear-gradient(45deg, #f093fb, #f5576c);
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(240, 147, 251, 0.3);
          ">Save</button>
          <button id="cancelTVProgress" style="
            flex: 1;
            padding: 12px;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
          ">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.querySelector('div').style.transform = 'scale(1)';
    }, 10);

    // Get references to the input fields
    const seasonInput = document.getElementById('tvSeason');
    const episodeInput = document.getElementById('tvEpisode');
    const episodeSearchInput = document.getElementById('episodeSearch');

    // Create a function to handle the update
    const updateEpisodeName = () => {
        const season = parseInt(seasonInput.value);
        const episode = parseInt(episodeInput.value);

        getEpisodeDetails(item.tmdbId, season, episode, (details) => {
            if (details && details.name) {
                episodeSearchInput.value = details.name;
            } else {
                // Optionally clear the title field if the episode is not found
                episodeSearchInput.value = '';
            }
        });
    };

    // Add event listeners to the season and episode inputs
    seasonInput.addEventListener('input', updateEpisodeName);
    episodeInput.addEventListener('input', updateEpisodeName);

    // Episode search functionality
    let searchTimeout;
    const episodeSearch = document.getElementById('episodeSearch');
    const episodeResults = document.getElementById('episodeResults');
    
    episodeSearch.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      const query = this.value.trim();
      
      if (query.length > 2) {
        searchTimeout = setTimeout(() => searchEpisodes(item.tmdbId, query), 300);
      } else {
        episodeResults.style.display = 'none';
      }
    });

    function searchEpisodes(tmdbId, query) {
      // Search through multiple seasons for episodes
      const promises = [];
      for (let season = 1; season <= 10; season++) {
        const url = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?api_key=${API_KEY}`;
        promises.push(fetch(url).then(res => res.json()).catch(() => null));
      }

      Promise.all(promises).then(seasons => {
        const matchingEpisodes = [];
        seasons.forEach((season, index) => {
          if (season && season.episodes) {
            season.episodes.forEach(episode => {
              if (episode.name.toLowerCase().includes(query.toLowerCase())) {
                matchingEpisodes.push({
                  ...episode,
                  season_number: index + 1
                });
              }
            });
          }
        });

        if (matchingEpisodes.length > 0) {
          displayEpisodeResults(matchingEpisodes.slice(0, 5));
        } else {
          episodeResults.style.display = 'none';
        }
      });
    }

    function displayEpisodeResults(episodes) {
      episodeResults.innerHTML = episodes.map(episode => `
        <div class="episode-result" data-season="${episode.season_number}" data-episode="${episode.episode_number}" data-title="${episode.name}" style="
          padding: 10px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          transition: background 0.2s;
        ">
          <div style="font-weight: 500; font-size: 13px; margin-bottom: 2px;">${episode.name}</div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.6);">S${episode.season_number}E${episode.episode_number.toString().padStart(2, '0')}</div>
        </div>
      `).join('');
      
      episodeResults.style.display = 'block';
      
      document.querySelectorAll('.episode-result').forEach(result => {
        result.addEventListener('mouseenter', function() {
          this.style.background = 'rgba(255,255,255,0.1)';
        });
        
        result.addEventListener('mouseleave', function() {
          this.style.background = 'transparent';
        });
        
        result.addEventListener('click', function() {
          document.getElementById('tvSeason').value = this.dataset.season;
          document.getElementById('tvEpisode').value = this.dataset.episode;
          episodeSearch.value = this.dataset.title;
          episodeResults.style.display = 'none';
        });
      });
    }
    
    document.getElementById('saveTVProgress').addEventListener('click', () => {
      const season = parseInt(document.getElementById('tvSeason').value);
      const episode = parseInt(document.getElementById('tvEpisode').value);
      const episodeTitle = episodeSearch.value.trim();
      
      item.currentSeason = season;
      item.currentEpisode = episode;
      if (episodeTitle) {
        item.currentEpisodeTitle = episodeTitle;
      }
      
      chrome.storage.local.set({watchlist: watchlist}, function() {
        loadWatchlist();
        closeTVProgressModal();
      });
    });
    
    document.getElementById('cancelTVProgress').addEventListener('click', closeTVProgressModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeTVProgressModal();
    });
  });
}

function closeTVProgressModal() {
  const modal = document.getElementById('tvProgressModal');
  if (modal) {
    modal.style.opacity = '0';
    modal.querySelector('div').style.transform = 'scale(0.9)';
    setTimeout(() => modal.remove(), 300);
  }
}
