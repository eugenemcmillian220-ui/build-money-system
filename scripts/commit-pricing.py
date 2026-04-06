#!/usr/bin/env python3
import subprocess
import sys

def run_git_command(cmd):
    """Execute a git command and return output."""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"Error: {result.stderr}")
            return False
        print(result.stdout)
        return True
    except Exception as e:
        print(f"Exception: {e}")
        return False

def main():
    print("[v0] Starting pricing system commit...")
    
    # Configure git user
    print("[v0] Configuring git...")
    run_git_command('git config user.name "v0[bot]"')
    run_git_command('git config user.email "v0[bot]@users.noreply.github.com"')
    
    # Check current branch
    print("[v0] Checking current branch...")
    run_git_command('git branch -v')
    
    # Stage all changes
    print("[v0] Staging changes...")
    if not run_git_command('git add -A'):
        print("Failed to stage changes")
        sys.exit(1)
    
    # Show what will be committed
    print("[v0] Changes to be committed:")
    run_git_command('git diff --cached --name-only')
    
    # Commit changes
    print("[v0] Creating commit...")
    commit_msg = """feat: implement comprehensive pricing system with Elite/Basic tiers, lifetime licenses, and affiliate tracking

- Added complete billing tier configuration (Elite Empire Phases 1-17, Basic Foundation Phases 1-3)
- Implemented lifetime license options (Starter $790, Pro $2390, On-Prem $4999)
- Added credit top-up packs with bulk discounts
- Integrated marketplace commission tracking (25%)
- Added affiliate program with 20% recurring commission
- Enhanced pricing table UI with tabbed interface
- Added lifetime license and affiliate support to Stripe service
- Created database migrations for new tables
- Added setup script for Stripe product creation
- Integrated affiliate code tracking in checkout flow
- Created public pricing page at /pricing

Co-authored-by: v0[bot] <v0[bot]@users.noreply.github.com>"""
    
    if not run_git_command(f'git commit -m "{commit_msg}"'):
        print("[v0] Commit may have failed or no changes to commit")
    
    # Show commit info
    print("[v0] Recent commits:")
    run_git_command('git log --oneline -5')
    
    print("[v0] Commit completed successfully!")

if __name__ == "__main__":
    main()
