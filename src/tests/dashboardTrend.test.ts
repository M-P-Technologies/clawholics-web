import { describe, expect, it } from "vitest";
import { bucketTrend, formatBucketLabel, granularityWord, trendBuckets, trendGranularity } from "@/lib/dashboardTrend";
import { resolvePeriod } from "@/lib/dashboardPeriods";

const TODAY = "2026-10-14"; // a Wednesday

describe("trend buckets", () => {
  it("picks day, week or month points for the range", () => {
    expect(["week", "month", "last30"].map((r) => trendGranularity(r as never))).toEqual(["day", "day", "day"]);
    expect(trendGranularity("last90")).toBe("week");
    expect(trendGranularity("year")).toBe("month");
    expect([granularityWord("day"), granularityWord("week"), granularityWord("month")]).toEqual(["per day", "per week", "per month"]);
  });

  it("this month: one point per day, stopping today", () => {
    const { granularity, buckets } = trendBuckets("month", resolvePeriod("month", TODAY).period, TODAY);
    expect(granularity).toBe("day");
    expect(buckets).toHaveLength(14);
    expect(buckets[0]).toEqual({ from: "2026-10-01", to: "2026-10-01" });
    expect(buckets[13]).toEqual({ from: "2026-10-14", to: "2026-10-14" });
  });

  it("this week: Monday to today only", () => {
    const { buckets } = trendBuckets("week", resolvePeriod("week", TODAY).period, TODAY);
    expect(buckets.map((b) => b.from)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
  });

  it("last 30 days: thirty points ending today", () => {
    const { buckets } = trendBuckets("last30", resolvePeriod("last30", TODAY).period, TODAY);
    expect(buckets).toHaveLength(30);
    expect(buckets[29].to).toBe(TODAY);
  });

  it("last 3 months: weekly points, the last one cut at today", () => {
    const { granularity, buckets } = trendBuckets("last90", resolvePeriod("last90", TODAY).period, TODAY);
    expect(granularity).toBe("week");
    expect(buckets).toHaveLength(13);
    expect(buckets[0]).toEqual({ from: "2026-07-17", to: "2026-07-23" });
    expect(buckets[12]).toEqual({ from: "2026-10-09", to: "2026-10-14" });
  });

  it("this year: monthly points, the current month cut at today", () => {
    const { granularity, buckets } = trendBuckets("year", resolvePeriod("year", TODAY).period, TODAY);
    expect(granularity).toBe("month");
    expect(buckets).toHaveLength(10);
    expect(buckets[0]).toEqual({ from: "2026-01-01", to: "2026-01-31" });
    expect(buckets[1].to).toBe("2026-02-28");
    expect(buckets[9]).toEqual({ from: "2026-10-01", to: "2026-10-14" });
  });

  it("has nothing to draw for a period that has not started", () => {
    expect(trendBuckets("month", { from: "2026-11-01", to: "2026-11-30" }, TODAY).buckets).toEqual([]);
  });
});

describe("bucketTrend", () => {
  const byDay = {
    "2026-10-12": { bookings: 1 },
    "2026-10-14": { bookings: 2 },
    "2026-10-20": { bookings: 9999 }, // after the buckets: ignored
  };

  it("adds up every day in a bucket, and missing days count as zero", () => {
    const { buckets } = trendBuckets("week", resolvePeriod("week", TODAY).period, TODAY);
    const trend = bucketTrend("day", buckets, byDay);
    expect(trend.granularity).toBe("day");
    expect(trend.points).toEqual([
      { date: "2026-10-12", bookings: 1 },
      { date: "2026-10-13", bookings: 0 },
      { date: "2026-10-14", bookings: 2 },
    ]);
  });

  it("a weekly bucket sums its days", () => {
    const trend = bucketTrend("week", [{ from: "2026-10-12", to: "2026-10-18" }], byDay);
    expect(trend.points[0]).toEqual({ date: "2026-10-12", bookings: 3 });
  });
});

describe("bucket labels", () => {
  it("names a point by its day, week or month", () => {
    expect(formatBucketLabel("day", "2026-10-03")).toBe("Oct 3");
    expect(formatBucketLabel("week", "2026-10-09")).toBe("Week of Oct 9");
    expect(formatBucketLabel("month", "2026-10-01")).toBe("Oct 2026");
  });
});
