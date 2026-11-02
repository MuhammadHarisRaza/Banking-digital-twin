import { formatNumber } from "../lib/seeded";
import type { ChannelOverview } from "../types";

/** Channel figures are illustrative demo data. The 7-day series end on the latest full day, 1 Nov. */
export const CALL_CENTER: ChannelOverview = {
  appKey: "callCenter",
  title: "Customer Experience (Call Center)",
  subtitle: "Omni-channel customer support across all branches",
  chartTitle: "Interaction Volume",
  chartType: "area",
  metrics: [
    { value: "48,320", label: "Total Interactions", trend: "+6%", direction: "up" },
    { value: "92.4%", label: "First Call Resolution", trend: "+2.1 pp", direction: "up" },
    { value: "48 sec", label: "Avg. Response Time", trend: "−12%", direction: "down" },
  ],
  ranges: [
    {
      id: "7d",
      label: "Last 7 Days",
      ticks: [0, 15000, 30000, 45000, 60000],
      points: [
        { label: "Oct 26", value: 28400 },
        { label: "Oct 27", value: 34200 },
        { label: "Oct 28", value: 30600 },
        { label: "Oct 29", value: 39800 },
        { label: "Oct 30", value: 36100 },
        { label: "Oct 31", value: 43900 },
        { label: "Nov 1", value: 48320 },
      ],
    },
    {
      id: "4w",
      label: "Last 4 Weeks",
      ticks: [0, 100000, 200000, 300000],
      points: [
        { label: "Oct 5", value: 228400 },
        { label: "Oct 12", value: 241900 },
        { label: "Oct 19", value: 236700 },
        { label: "Oct 26", value: 261320 },
      ],
    },
  ],
  formatTick: (v) => (v === 0 ? "0" : `${v / 1000}K`),
  formatValue: formatNumber,
};

export const MOBILE_APP: ChannelOverview = {
  appKey: "mobileApp",
  title: "Mobile App",
  subtitle: "Digital banking for customers across Pakistan",
  chartTitle: "Mobile Transactions",
  chartType: "bar",
  metrics: [
    { value: "6.4M", label: "Active Users", trend: "+8%", direction: "up" },
    { value: "78.6M", label: "Transactions", trend: "+11%", direction: "up" },
  ],
  ranges: [
    {
      id: "7d",
      label: "Last 7 Days",
      ticks: [0, 5, 10, 15, 20],
      points: [
        { label: "Oct 26", value: 6.6 },
        { label: "Oct 27", value: 8.4 },
        { label: "Oct 28", value: 9.3 },
        { label: "Oct 29", value: 10.8 },
        { label: "Oct 30", value: 11.9 },
        { label: "Oct 31", value: 14.1 },
        { label: "Nov 1", value: 17.5 },
      ],
    },
    {
      id: "4w",
      label: "Last 4 Weeks",
      ticks: [0, 20, 40, 60, 80],
      points: [
        { label: "Oct 5", value: 61.2 },
        { label: "Oct 12", value: 66.8 },
        { label: "Oct 19", value: 71.4 },
        { label: "Oct 26", value: 78.6 },
      ],
    },
  ],
  formatTick: (v) => (v === 0 ? "0" : `${v}M`),
  formatValue: (v) => `${v.toFixed(1)}M`,
};

/** Cities each channel's connection lines reach on the map. */
export const CALL_CENTER_REACH = ["Chitral", "Peshawar", "Zhob", "Quetta", "Khuzdar", "Turbat", "Gwadar", "Sukkur"];
export const MOBILE_APP_REACH = ["Gilgit", "Skardu", "Islamabad", "Sialkot", "Lahore", "Multan", "Bahawalpur", "Hyderabad", "Karachi"];
