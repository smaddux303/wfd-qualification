// pages/charts.js — Chart.js radar and history builders

function buildRadarChart(avg) {
  const ctx = document.getElementById('radar-chart');
  if (!ctx || !avg) return;

  const demand = [
    parseFloat(avg.avg_d1_demand)||0,
    parseFloat(avg.avg_d2_demand)||0,
    parseFloat(avg.avg_d3_demand)||0,
    parseFloat(avg.avg_d4_demand)||0,
    parseFloat(avg.avg_d5_demand)||0
  ];
  const cap = [
    parseFloat(avg.avg_d1_cap)||0,
    parseFloat(avg.avg_d2_cap)||0,
    parseFloat(avg.avg_d3_cap)||0,
    demand[3], // time pressure — no cap score, mirror demand so polygon closes cleanly
    parseFloat(avg.avg_d5_cap)||0
  ];

  radarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Patient\nAssessment','Clinical\nMgmt','Motor\nSkills','Time\nPressure','CRM'],
      datasets: [
        {
          label: 'Avg demand',
          data: demand,
          borderColor: '#4a7cff',
          backgroundColor: 'rgba(74,124,255,0.10)',
          borderWidth: 2,
          pointBackgroundColor: '#4a7cff',
          pointRadius: 4
        },
        {
          label: 'Avg capability',
          data: cap,
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255,107,107,0.10)',
          borderWidth: 2,
          borderDash: [5,3],
          pointBackgroundColor: '#ff6b6b',
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 5,
          ticks: {
            stepSize: 1,
            color: '#7c86a2',
            font: { size: 10 },
            backdropColor: 'transparent',
            callback: v => v === 0 ? '' : v
          },
          pointLabels: { color: '#e8eaf0', font: { size: 11 } },
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' }
        }
      }
    }
  });
}

function buildHistoryChart(dcas) {
  const ctx = document.getElementById('history-chart');
  if (!ctx) return;

  historyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dcas.map((_,i) => `DCA ${i+1}`),
      datasets: [
        { label:'Assessment',    data: dcas.map(d=>d.d1_capability), borderColor:'#534AB7', backgroundColor:'transparent', borderWidth:2, pointRadius:3, tension:0.3, spanGaps:true },
        { label:'Clinical mgmt', data: dcas.map(d=>d.d2_capability), borderColor:'#E24B4A', backgroundColor:'transparent', borderWidth:2, borderDash:[6,3], pointRadius:3, tension:0.3, spanGaps:true },
        { label:'Motor skills',  data: dcas.map(d=>d.d3_capability), borderColor:'#D85A30', backgroundColor:'transparent', borderWidth:2, borderDash:[2,2], pointRadius:3, tension:0.3, spanGaps:true },
        { label:'CRM',           data: dcas.map(d=>d.d5_capability), borderColor:'#3ecf8e', backgroundColor:'transparent', borderWidth:2, pointRadius:3, tension:0.3, spanGaps:true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min:0, max:5, ticks:{ stepSize:1, color:'#7c86a2', font:{size:11} }, grid:{ color:'rgba(255,255,255,0.05)' } },
        x: { ticks:{ color:'#7c86a2', font:{size:11}, autoSkip:false }, grid:{ color:'rgba(255,255,255,0.05)' } }
      }
    }
  });
}
