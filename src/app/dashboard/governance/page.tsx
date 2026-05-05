import DaoGovernance from "@/components/dashboard/DaoGovernance";

export const metadata = {
  title: "Sovereign DAO | Governance Dashboard",
  description: "Manage autonomous proposals and tokenomics for your empire.",
};

export default function GovernancePage() {
  return <DaoGovernance />;
}
