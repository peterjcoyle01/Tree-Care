const STORAGE_KEY = 'treecare_companion_data_v1';

const seasonalContent = {
  Spring: [
    'Inspect for winter damage and broken limbs.',
    'Check soil moisture and refresh mulch away from trunk flare.',
    'Schedule pruning for suitable species before heavy growth where appropriate.',
    'Watch for early pest activity and fungal issues.'
  ],
  Summer: [
    'Deep water during hot dry stretches.',
    'Monitor leaf scorch, insect stress, and canopy thinning.',
    'Avoid heavy pruning during extreme heat unless safety requires it.',
    'Inspect after storms for torn limbs and cracks.'
  ],
  Fall: [
    'Clean up fallen debris and inspect tree structure.',
    'Book dormant-season pruning for appropriate species.',
    'Water before freeze-up if conditions are dry.',
    'Check stakes, wraps, and root flare before winter.'
  ],
  Winter: [
    'Watch for snow load and ice damage.',
    'Plan pruning and maintenance schedule for the coming year.',
    'Protect young trees from salt and mechanical damage.',
    'Inspect hazard trees after wind events.'
  ]
};

let state = loadState();
let deferredPrompt = null;

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  return { trees: [], premium: false };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toast(message) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 2200);
}

function nextReminderText(tree) {
  if (!tree.lastPruned) return 'Add a pruning date to generate reminders.';
  const last = new Date(tree.lastPruned);
  const next = new Date(last);
  next.setMonth(next.getMonth() + 12);
  return `Suggested review: ${next.toLocaleDateString()}`;
}

function renderStats() {
  const attention = state.trees.filter(t => t.condition !== 'Healthy').length;
  const reminders = state.trees.filter(t => t.lastPruned).length;
  document.getElementById('statTrees').textContent = state.trees.length;
  document.getElementById('statAttention').textContent = attention;
  document.getElementById('statReminders').textContent = reminders;
}

function renderTrees() {
  const list = document.getElementById('treeList');
  if (!state.trees.length) {
    list.className = 'card-list empty';
    list.textContent = 'No trees added yet.';
    return;
  }

  list.className = 'card-list';
  list.innerHTML = state.trees.map((tree, index) => `
    <article class="tree-card">
      <h4>${escapeHtml(tree.name)}</h4>
      <div class="tree-meta">${escapeHtml(tree.species)} • ${escapeHtml(tree.condition)} • Watering: ${escapeHtml(tree.watering)}</div>
      <p>${escapeHtml(tree.notes || 'No notes added.')}</p>
      <div class="notice"><strong>${nextReminderText(tree)}</strong></div>
      <div class="tree-actions">
        <button onclick="removeTree(${index})" class="danger">Delete</button>
      </div>
    </article>
  `).join('');
}

function renderSeasonChecklist() {
  const season = document.getElementById('seasonPicker').value;
  const list = document.getElementById('seasonChecklist');
  list.innerHTML = seasonalContent[season].map(item => `<li>${item}</li>`).join('');
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function removeTree(index) {
  state.trees.splice(index, 1);
  saveState();
  renderAll();
  toast('Tree removed');
}
window.removeTree = removeTree;

function renderPremiumState() {
  const btn = document.getElementById('upgradeBtn');
  btn.textContent = state.premium ? 'Premium Active' : 'Unlock Premium';
  btn.disabled = state.premium;
}

function renderAll() {
  renderStats();
  renderTrees();
  renderSeasonChecklist();
  renderPremiumState();
}

document.getElementById('treeForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!state.premium && state.trees.length >= 3) {
    toast('Free plan limit reached. Upgrade to add more trees.');
    return;
  }
  const tree = {
    name: document.getElementById('treeName').value.trim(),
    species: document.getElementById('treeSpecies').value,
    condition: document.getElementById('treeCondition').value,
    lastPruned: document.getElementById('lastPruned').value,
    watering: document.getElementById('watering').value,
    notes: document.getElementById('treeNotes').value.trim()
  };
  state.trees.unshift(tree);
  saveState();
  e.target.reset();
  renderAll();
  toast('Tree saved');
});

document.getElementById('seasonPicker').addEventListener('change', renderSeasonChecklist);

document.getElementById('riskForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const checks = ['riskHanging', 'riskCracks', 'riskLean', 'riskFungus', 'riskStorm']
    .map(id => document.getElementById(id).checked)
    .filter(Boolean).length;
  const output = document.getElementById('riskOutput');
  if (checks <= 1) {
    output.innerHTML = '<strong>Low to moderate concern.</strong> Monitor and document changes.';
  } else if (checks <= 3) {
    output.innerHTML = '<strong>Moderate concern.</strong> Schedule a professional inspection soon.';
  } else {
    output.innerHTML = '<strong>High concern.</strong> Recommend urgent arborist review, especially near targets.';
  }
  output.classList.remove('muted');
});

document.getElementById('upgradeBtn').addEventListener('click', () => {
  state.premium = true;
  saveState();
  renderPremiumState();
  toast('Premium unlocked in demo mode');
});

document.getElementById('clearBtn').addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  state = { trees: [], premium: false };
  renderAll();
  toast('All local data cleared');
});

document.getElementById('demoDataBtn').addEventListener('click', () => {
  state = {
    premium: false,
    trees: [
      {
        name: 'Front Maple',
        species: 'Maple',
        condition: 'Needs pruning',
        lastPruned: '2025-04-10',
        watering: 'Bi-weekly',
        notes: 'Small deadwood over driveway. Good candidate for structural cleanup.'
      },
      {
        name: 'Back Spruce',
        species: 'Spruce',
        condition: 'Monitor',
        lastPruned: '2025-09-18',
        watering: 'Weekly',
        notes: 'Monitor thinning interior growth and check after spring storms.'
      }
    ]
  };
  saveState();
  renderAll();
  toast('Demo data loaded');
});

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('installBtn').classList.remove('hidden');
});

document.getElementById('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('installBtn').classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

renderAll();
