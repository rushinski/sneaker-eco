"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

type Customer = {
  displayId: string;
  name: string;
  email: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const response = await fetch("/api/admin/customers/" + customerId, {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Failed to load customer");
          return;
        }
        setCustomer(data.customer);
      } catch {
        setError("Failed to load customer");
      } finally {
        setIsLoading(false);
      }
    };

    void loadCustomer();
  }, [customerId]);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push("/admin/customers")}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Customers
      </button>

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : customer ? (
        <>
          <div>
            <h1 className="text-3xl font-bold text-white">{customer.name}</h1>
            <p className="mt-1 font-mono text-sm text-gray-500">{customer.displayId}</p>
          </div>
          <dl className="divide-y divide-zinc-800/70 rounded border border-zinc-800/70 bg-zinc-900 p-5">
            {[
              ["Email", customer.email ?? "—"],
              ["Role", customer.role],
              ["Created", formatDate(customer.createdAt)],
              ["Updated", formatDate(customer.updatedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-6 py-3">
                <dt className="text-gray-500">{label}</dt>
                <dd className="text-right text-gray-200">{value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
    </div>
  );
}
