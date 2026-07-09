import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { useToast } from '../hooks/use-toast';
import { establishConnection, fetchDestinations } from '../lib/api';

interface Destination {
  ID: string;
  name: string;
  description?: string;
}

interface SAPConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * The session ID to bind this connection to.
   * Pass the real DB UUID when a session already exists.
   * Pass a client-generated tempId (crypto.randomUUID()) before the session
   * is created — Index.tsx will call remapConnection() once the real UUID arrives.
   */
  sessionId: string;
  /**
   * Optional. When provided, this is the tempId that was used for the connection.
   * The parent can read this back to know which ID to remap after session creation.
   * Usually sessionId === tempId when the session doesn't exist yet.
   */
  tempId?: string;
  /** Called after a successful connection so the parent can record the connected state. */
  onConnected?: (sessionId: string) => void;
}

export function SAPConnectionModal({
  isOpen,
  onClose,
  sessionId,
  onConnected,
}: SAPConnectionModalProps) {
  const [loading, setLoading] = useState(false);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [destinationsError, setDestinationsError] = useState<string | null>(null);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    destinationName: '',
    user: '',
    password: '',
    client: '100',
    language: 'EN'
  });

  // Load the active destination names whenever the dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setDestinationsLoading(true);
    setDestinationsError(null);
    fetchDestinations()
      .then(list => {
        if (cancelled) return;
        setDestinations(list);
      })
      .catch(err => {
        if (cancelled) return;
        setDestinationsError(err.message || 'Could not load destinations.');
      })
      .finally(() => {
        if (!cancelled) setDestinationsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.destinationName) {
      toast({ title: 'Select a destination', description: 'Please choose a destination before connecting.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await establishConnection(sessionId, formData);
      toast({
        title: 'Connection Successful',
        description: 'Secure SAP session established in memory.'
      });
      onConnected?.(sessionId);
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
            Choose the destination for this chat and enter your SAP credentials. Credentials are securely held in memory and never saved to the database.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="destination">Destination</Label>
            <Select
              value={formData.destinationName}
              onValueChange={value => setFormData({ ...formData, destinationName: value })}
              disabled={destinationsLoading || !!destinationsError}
            >
              <SelectTrigger id="destination">
                <SelectValue
                  placeholder={
                    destinationsLoading
                      ? 'Loading destinations…'
                      : destinationsError
                        ? 'Could not load destinations'
                        : 'Select a destination'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {destinations.map(dest => (
                  <SelectItem key={dest.ID} value={dest.name}>
                    {dest.name}
                    {dest.description ? ` — ${dest.description}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destinationsError && (
              <p className="text-sm text-destructive">{destinationsError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="user">SAP User</Label>
            <Input
              id="user"
              required
              value={formData.user}
              onChange={e => setFormData({ ...formData, user: e.target.value })}
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
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">SAP Client</Label>
              <Input
                id="client"
                required
                value={formData.client}
                onChange={e => setFormData({ ...formData, client: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Input
                id="language"
                required
                value={formData.language}
                onChange={e => setFormData({ ...formData, language: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.destinationName}>
              {loading ? 'Connecting...' : 'Establish Connection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
