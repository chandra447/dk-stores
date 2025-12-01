import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * DebugManagerAccounts - A debugging tool for admin to verify manager account issues
 *
 * This component helps debug manager login problems by:
 * 1. Showing all manager accounts in the database
 * 2. Testing the findManagerAccountByName query
 * 3. Providing detailed diagnostics and recommendations
 *
 * Usage: Add this component temporarily to any admin page to debug manager account issues
 */
export default function DebugManagerAccounts() {
  const [searchName, setSearchName] = useState('');
  const [testName, setTestName] = useState('');

  // Get detailed debug information
  const debugInfo = useQuery(api.auth.users.debugManagerAccounts,
    searchName ? { searchName } : {}
  );

  // Test the actual login query
  const testResult = useQuery(api.auth.users.findManagerAccountByName,
    testName ? { name: testName } : 'skip'
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">🔍 Manager Accounts Debug Tool</h1>
        <p className="text-muted-foreground">Debug manager login issues and verify account configuration</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="test-login">Test Login</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {debugInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-2">Manager Users</h3>
                <p className="text-3xl font-bold text-primary">{debugInfo.totalManagerUsers}</p>
                <p className="text-sm text-muted-foreground">In users table</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-2">Manager Employees</h3>
                <p className="text-3xl font-bold text-secondary">{debugInfo.totalManagerEmployees}</p>
                <p className="text-sm text-muted-foreground">In employees table</p>
              </Card>
              <Card className="p-4">
                <h3 className="font-semibold text-foreground mb-2">Status</h3>
                <p className="text-3xl font-bold text-green-600">
                  {debugInfo.recommendations.some(r => r.includes("✅")) ? "✅ OK" : "⚠️ Issues"}
                </p>
                <p className="text-sm text-muted-foreground">System health</p>
              </Card>
            </div>
          )}

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
            {debugInfo ? (
              <div className="space-y-2">
                {debugInfo.recommendations.map((recommendation, index) => (
                  <Alert key={index} variant={recommendation.includes("✅") ? "default" : "destructive"}>
                    <AlertDescription>{recommendation}</AlertDescription>
                  </Alert>
                ))}
              </div>
            ) : (
              <p>Loading debug information...</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="test-login" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Test Manager Login Query</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Manager Name to Test</label>
                <Input
                  placeholder="e.g., jimbei"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                onClick={() => setTestName(testName)}
                disabled={!testName.trim()}
              >
                Test Login Query
              </Button>
            </div>

            {testResult !== undefined && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">
                  {testResult ? "✅ Found Manager Account" : "❌ Manager Account Not Found"}
                </h3>

                {testResult ? (
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Name:</span>
                        <span>{testResult.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Email:</span>
                        <span className="font-mono text-sm">{testResult.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">User ID:</span>
                        <span className="font-mono text-sm">{testResult.userId}</span>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription>
                      No manager account found for "{testName}". Check the console logs for detailed debugging information.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Search Manager Accounts</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Search by Name (optional)</label>
                <Input
                  placeholder="e.g., jimbei"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </Card>

          {debugInfo && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {searchName ? `Search Results for "${searchName}"` : "All Manager Users"}
              </h3>

              {debugInfo.filteredUsers.length > 0 ? (
                <div className="space-y-4">
                  {debugInfo.filteredUsers.map((user) => (
                    <Card key={user.id} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium">Name:</span>
                            <span>{user.name}</span>
                            <Badge variant="outline">{user.role}</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Email:</span>
                            <span className="font-mono text-sm">{user.email}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm">
                            <span className="font-medium">Normalized for Login:</span>
                            <span className="ml-2 font-mono bg-yellow-100 px-2 py-1 rounded">
                              {user.normalizedForLogin}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertDescription>
                    {searchName
                      ? `No manager accounts found matching "${searchName}"`
                      : "No manager accounts found in the database"
                    }
                  </AlertDescription>
                </Alert>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}