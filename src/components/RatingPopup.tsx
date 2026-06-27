import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { submitRating } from '@/lib/api';
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = ["Reports", "Forms", "Interfaces", "Workflow", "Enhancements", "CDS views", "RAP", "CAP", "BTP", "CPI", "General ABAP"];

export default function RatingPopup({ isOpen, onClose, modelId }: { isOpen: boolean, onClose: () => void, modelId: string }) {
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState('');
    const { toast } = useToast();

    const handleSubmit = async () => {
        const userId = localStorage.getItem('token') || 'anonymous';
        try {
            await submitRating(userId, modelId, category, rating);
            toast({ title: "Feedback Submitted", description: "Thank you for rating this response!" });
            onClose();
        } catch (e) {
            toast({ title: "Error", description: "Failed to submit rating.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Rate the {modelId} Response</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-6 py-4">
                    <div className="flex gap-2 justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <span 
                                key={star} 
                                className={`cursor-pointer text-4xl transition-colors ${rating >= star ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-200'}`} 
                                onClick={() => setRating(star)}
                            >★</span>
                        ))}
                    </div>
                    <Select onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select SAP Content Area" />
                        </SelectTrigger>
                        {/* Added z-[9999] to float above the modal and max-h-48 to make the 11 items scrollable */}
                        <SelectContent className="z-[9999] max-h-48 overflow-y-auto">
                            {CATEGORIES.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!rating || !category} onClick={handleSubmit}>Submit</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}