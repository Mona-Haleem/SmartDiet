import Component from "../Component.js";
import { queryService } from "../../../common/script.js";

export default class PeriodProgress extends Component {
  constructor(el, refs, data) {
    super(el, refs, data);
    this.chartData = [];
    this.selectedMetric = null;
    this.chart = null;
    this.chartHeight = 150;
    window.periodProgress = this;
    this._init();
  }

  async _init() {
    await this.loadPeriodData();
    this.getSummary();
  }

  async loadPeriodData() {
    const { selectedPeriod, selectedDate, selectedPlanType } = this.$data;
    const url = `/diet/progress/period/?period=${selectedPeriod}&date=${selectedDate}&type=${selectedPlanType}`;

    await queryService.query(
      ["periodData", selectedPeriod, selectedDate, selectedPlanType, url],
      {
        queryFn: queryService.createQueryFn(url, "get"),
        onSuccess: (ctx) => {
          console.log("====", ctx.data);
          const data = ctx.data;
          // this.$data.metricsData = data.metrics || [];
          this.chartData = data.chart_data || [];

          // Calculate achievement for each metric
          this.$data.metricsData =
            ctx.data?.metrics.map((m) => ({
              ...m,
              id: `metric-${m.id}`,
              change: Math.round(parseFloat(m.change) * 100) / 100,
              achievement: m.score,
            })) || [];
          console.log("====", this.chartData);

          this.initChart();
        },
        force: true,
      }
    );
  }
  async initChart() {
    const canvas = this.$refs.chartCanvas;
    if (!canvas) return;

    // Dynamically import Chart.js
    // const Chart = await import().then(m => m.default);

    const ctx = canvas.getContext("2d");

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }
    const rootStyles = getComputedStyle(document.documentElement);
    const primaryRGB = rootStyles.getPropertyValue('--primary-color-rgb').trim();


    const values = this.chartData.map((d) => d.overall_score);

    const chartConfig = {
      type: "line",
      data: {
        labels: this.chartData.map((d) => d.date.slice(8,)),
        datasets: [
          {
            label: this.selectedMetric
              ? this.selectedMetric.name
              : "Overall Score",
            data: values,
            borderColor: `rgb(${primaryRGB})`,
            backgroundColor: `rgba(${primaryRGB}, 0.5)`,
            tension: 0.3,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#fff",
            pointBorderColor: `rgb(${primaryRGB})`,
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (ctx) => `${ctx.raw}%`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => {
                if (value < 1) return value.toFixed(2) + "%";
                if (value < 10) return value.toFixed(1) + "%";
                return Math.round(value) + "%";
              },
            },
          },
        },
        
      },
    };

    this.chart = new window.Chart(ctx, chartConfig);
  }

  highlightMetric(metric) {
    this.selectedMetric = metric;
    this.$data.chartName = metric.name
    this.updateChart();
  }

  showOverallProgress() {
    this.selectedMetric = null;
    this.$data.chartName = "Overall Progress"

    this.updateChart();
  }

  updateChart() {
    if (!this.chart) return;
    this.chart.data.datasets[0].label = this.selectedMetric
      ? this.selectedMetric.name
      : "Overall Score";
    const values = this.chartData.map((d) =>
      this.selectedMetric
        ? d.metrics?.[this.selectedMetric?.id.split("-")[1]] ?? 0
        : d.overall_score ?? 0
    );
    const maxValue = Math.max(...values, 1); // prevent 0 max
    const padding = maxValue * 0.3;
    this.chart.options.scales.y.max = this.selectedMetric
      ? Math.min(maxValue + padding, 100)
      : 100;
    console.log(
      values,
      maxValue,
      this.chart.data.datasets[0].label,
      this.selectedMetric?.id
    );
    this.chart.data.datasets[0].data = values;
    this.chart.update();
  }

  getSummary() {
    if (!this.$data.metricsData.length) {
      this.$data.summary =
        "No data available for this period. Start tracking your metrics to see progress insights!";
      return;
    }

    const avgAchievement =
      this.$data.metricsData.reduce((sum, m) => sum + m.achievement, 0) /
      this.$data.metricsData.length;
    const topMetrics = this.$data.metricsData
      .filter((m) => m.achievement >= 0.8)
      .map((m) => m.name);
    const needsWork = this.$data.metricsData
      .filter((m) => m.achievement < 0.5)
      .map((m) => m.name);

    let summary = `- During this ${
      this.$data.selectedPeriod
    }, your overall achievement rate is ${Math.round(avgAchievement * 100)}%\n`;

    if (topMetrics.length > 0) {
      summary += `- You're doing great with ${topMetrics.join(
        ", "
      )}. Keep up the excellent work!\n`;
    }

    if (needsWork.length > 0) {
      summary += `- Consider focusing more attention on ${needsWork.join(
        ", "
      )} to improve your results.\n`;
    } else {
      summary += `- You're maintaining good progress across all tracked metrics.\n`;
    }

    const trend =
      this.$data.metricsData.filter((m) => m.change > 0).length /
      this.$data.metricsData.length;
    if (trend > 0.7) {
      summary += `- Most of your metrics show positive trends, indicating consistent improvement\n`;
    } else if (trend < 0.3) {
      summary += `-Several metrics show declining trends. Review your approach and consider adjustments.\n`;
    } else {
      summary += `-Your progress is mixed across different metrics. Stay focused and consistent.\n`;
    }

    this.$data.summary = summary;
    return summary;
  }

  // formatValue(value, type) {
  //   if (value === null || value === undefined) return '--';

  //   if (type === 'boolean') {
  //     return value === true || String(value).toLowerCase() === 'true' ? 'Yes' : 'No';
  //   } else if (type === 'scale') {
  //     return `${value}/5`;
  //   }

  //   return String(value);
  // }

  formatChange(change, type) {
    if (change === 0) return "0";

    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}`;
  }

  getMetricIcon(type) {
    const icons = {
      continues: "fa-chart-line",
      daily: "fa-calendar-day",
      boolean: "fa-check-circle",
      scale: "fa-star-half-alt",
      category: "fa-tags",
    };
    return icons[type] || "fa-circle";
  }
}
console.log("period loaded");
