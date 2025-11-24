import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


interface RegisterType {
  id: string;
  name: string;
  address?: string;
  registerAvatar: string;
  createdAt: number;
}

interface RegisterCardProps {
  register: RegisterType;
}

export function RegisterCard({ register }: RegisterCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Store className="w-5 h-5" />
          {register.name}
        </CardTitle>
        <CardDescription>{register.address || 'No address provided'}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Clickable Store Avatar */}
        <div className="text-center p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:bg-muted hover:shadow-md hover:shadow-primary/20 group">
          <Link
            to={`/registers/${register.id}`}
            className="block transition-transform hover:scale-105 active:scale-95"
          >
            <img
              src={`https://api.dicebear.com/9.x/rings/svg?seed=${register.registerAvatar}`}
              alt={`${register.name} avatar - Click to manage employees`}
              className="w-32 h-32 mx-auto rounded-full border-4 border-background shadow-lg cursor-pointer transition-all duration-200"
            />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}