import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';
import { establishConnection } from '../lib/api';

interface SAPConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
}

export function SAPConnectionModal({ isOpen, onClose, sessionId }: SAPConnectionModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    url: '',
    user: '',
    password: '',
    client: '100',
    language: 'EN'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await establishConnection(sessionId, formData);
      toast({ 
        title: 'Connection Successful', 
        description: 'Secure SAP session established in memory.' 
      });
      onClose();
    } catch (err: any) {
      toast({ 
        title: 'Connection Failed', 
        description: err.message || 'Could not verify SAP credentials', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect to SAP System</DialogTitle>
          <DialogDescription>
            Enter your connection details for this specific chat. Credentials are securely held in memory and never saved to the database.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url">SAP URL</Label>
            <Input 
              id="url"
              required 
              value={formData.url} 
              onChange={e => setFormData({...formData, url: e.target.value})} 
              placeholder="https://..." 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user">SAP User</Label>
            <Input 
              id="user"
              required 
              value={formData.user} 
              onChange={e => setFormData({...formData, user: e.target.value})} 
              placeholder="e.g. DEVELOPER"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">SAP Password</Label>
            <Input 
              id="password"
              type="password" 
              required 
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">SAP Client</Label>
              <Input 
                id="client"
                required 
                value={formData.client} 
                onChange={e => setFormData({...formData, client: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input 
                id="language"
                required 
                value={formData.language} 
                onChange={e => setFormData({...formData, language: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Connecting...' : 'Establish Connection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}