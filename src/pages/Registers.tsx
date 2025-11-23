import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Field, FieldGroup, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Store, Plus, Users } from 'lucide-react';

interface RegisterType {
  id: string;
  name: string;
  address?: string;
  createdAt: number;
}

interface CreateRegisterFormData {
  name: string;
  address: string;
}

function Registers() {
  const registers = useQuery(api.mutations.getMyRegisters);
  const createRegister = useMutation(api.mutations.createRegister);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CreateRegisterFormData>({
    name: '',
    address: '',
  });

  const handleInputChange = (field: keyof CreateRegisterFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleCreateRegister = async () => {
    setError('');

    if (!formData.name.trim()) {
      setError('Store name is required');
      return;
    }

    setLoading(true);

    try {
      await createRegister({
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
      });

      // Reset form and close dialog
      setFormData({
        name: '',
        address: '',
      });
      setIsCreateDialogOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Your Stores</h1>
          <p className="text-muted-foreground">Manage your store locations and employees</p>
        </div>

        {/* Create Register Button */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Store
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Store</DialogTitle>
              <DialogDescription>
                Add a new store location to your business
              </DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Store Name</FieldLabel>
                <Input
                  id="name"
                  placeholder="e.g., Main Street Store"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="h-12"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input
                  id="address"
                  placeholder="e.g., 123 Main St, City, State"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="h-12"
                />
              </Field>

              {error && (
                <FieldDescription className="text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                  {error}
                </FieldDescription>
              )}
            </FieldGroup>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRegister}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Store'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading State */}
      {registers === undefined && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading your stores...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {registers && registers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No stores yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Create your first store location to start managing employees and attendance.
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Your First Store
          </Button>
        </div>
      )}

      {/* Register Grid */}
      {registers && registers.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {registers.map((register) => (
            <Card key={register.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  {register.name}
                </CardTitle>
                <CardDescription>{register.address || 'No address provided'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status */}
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    Active
                  </div>
                  <div className="text-sm text-muted-foreground">Status</div>
                </div>

                {/* Creation Date */}
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">
                    Created {new Date(register.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Action Button */}
                <Button asChild className="w-full">
                  <Link to={`/registers/${register.id}`}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Employees
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default Registers;