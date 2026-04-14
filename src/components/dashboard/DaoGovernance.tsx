"use client";

import { useState, useEffect } from "react";
import { 
  Gavel, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  Plus, 
  ChevronRight,
  Vote
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function DaoGovernance() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [balances, setBalances] = useState({ AGT: 0, UGT: 0 });

  return (
    <div className="space-y-8 p-6">
      {/* Header & Token Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sovereign DAO</h1>
          <p className="text-muted-foreground">Autonomous governance and profit distribution for the swarm.</p>
        </div>
        
        <div className="flex gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Agent Tokens (AGT)</p>
                <p className="text-xl font-bold">{balances.AGT.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">User Tokens (UGT)</p>
                <p className="text-xl font-bold">{balances.UGT.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Governance View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Proposals */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Gavel className="w-5 h-5" /> Active Proposals
            </h2>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" /> New Proposal
            </Button>
          </div>

          <div className="space-y-4">
            {proposals.length === 0 ? (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-12 text-center">
                  <Vote className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                  <h3 className="text-lg font-medium">No active proposals</h3>
                  <p className="text-sm text-muted-foreground">The swarm is currently operating under standard protocol.</p>
                </CardContent>
              </Card>
            ) : (
              proposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))
            )}
          </div>
        </div>

        {/* Treasury & Analytics */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Swarm Treasury
          </h2>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Managed Value</CardDescription>
              <CardTitle className="text-4xl font-bold text-green-500">$124,500.00</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Yield Performance (MoM)</span>
                  <span className="text-green-500 font-medium">+12.4%</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              
              <div className="pt-4 space-y-3">
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                  <span>Pending Distributions</span>
                  <Badge variant="secondary">$4,200</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50 text-sm">
                  <span>R&D Budget (Phase 21)</span>
                  <Badge variant="outline">$12,000</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">DAO Health Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">98/100</div>
                <Badge className="bg-green-500">OPTIMAL</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Swarm decentralization is high. Governance participation is at 84%.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: any }) {
  const totalVotes = proposal.votes_for + proposal.votes_against;
  const progress = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 0;

  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-1">
            <Badge variant="outline" className="mb-2 uppercase tracking-widest text-[10px]">
              {proposal.type}
            </Badge>
            <h3 className="text-lg font-bold group-hover:text-primary transition-colors">
              {proposal.title}
            </h3>
          </div>
          <Badge className={proposal.status === 'active' ? 'bg-blue-500' : 'bg-green-500'}>
            {proposal.status}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-6 line-clamp-2">
          {proposal.description}
        </p>

        <div className="space-y-3">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-green-500 uppercase tracking-tighter">FOR: {proposal.votes_for}</span>
            <span className="text-red-500 uppercase tracking-tighter">AGAINST: {proposal.votes_against}</span>
          </div>
          <Progress value={progress} className="h-2 bg-red-500/20 [&>div]:bg-green-500" />
          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-muted-foreground">Threshold: {proposal.threshold} votes</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
