"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

type CustomerRow = {
  routeId: string;
  displayId: string;
  name: string;
  email: string | null;
  role: string;
  createdAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await fetch("/api/admin/customers", { cache: "no-store" });
        const data = await response.json();
        setCustomers(data.customers ?? []);
      } finally {
        setIsLoading(false);
      }
    };

    void loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.displayId, customer.name, customer.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [customers, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white">Customers</h1>
        <p className="text-gray-400">Registered customer profiles</p>
      </div>

      <label className="flex max-w-md items-center gap-2 border border-zinc-800/70 bg-zinc-900 px-3 py-2">
        <Search className="h-4 w-4 text-gray-500" />
        <span className="sr-only">Search customers</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, email, or ID"
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
        />
      </label>

      <div className="overflow-hidden rounded border border-zinc-800/70 bg-zinc-900">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/70 bg-zinc-800">
                  <th className="p-4 text-left font-semibold text-gray-400">Created</th>
                  <th className="p-4 text-left font-semibold text-gray-400">Customer</th>
                  <th className="hidden p-4 text-left font-semibold text-gray-400 md:table-cell">
                    Email
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.routeId}
                    role="link"
                    tabIndex={0}
                    onClick={() => router.push("/admin/customers/" + customer.routeId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push("/admin/customers/" + customer.routeId);
                      }
                    }}
                    className="cursor-pointer border-b border-zinc-800/70 hover:bg-zinc-800 focus-visible:outline"
                  >
                    <td className="p-4 text-gray-400">
                      {formatDate(customer.createdAt)}
                    </td>
                    <td className="p-4 text-white">
                      <div>{customer.name}</div>
                      <div className="font-mono text-xs text-gray-500">
                        {customer.displayId}
                      </div>
                    </td>
                    <td className="hidden p-4 text-gray-400 md:table-cell">
                      {customer.email ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
