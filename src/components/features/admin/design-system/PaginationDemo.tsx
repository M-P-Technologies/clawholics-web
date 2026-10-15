"use client";

import { useState } from "react";
import { Pagination, paginate } from "@/components/molecules";

const ROWS = Array.from({ length: 118 }, (_, i) => i + 1);

// The pager over a made-up list of 118 rows.
export default function PaginationDemo() {
  const [page, setPage] = useState(6);
  const view = paginate(ROWS, page);
  return <Pagination page={view.current} totalPages={view.pages} onPageChange={setPage} summary={view} />;
}
