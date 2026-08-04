import { useState } from "react";
import { Input }   from "@/components/ui/input";
import { Button }  from "@/components/ui/button";
import { Label }   from "@/components/ui/label";

interface CredentialsProps {
    onConnect: (creds: { sapUrl: string; sapUser: string; sapPassword: string }) => void;
    loading?: boolean;
}

export default function Credentials({ onConnect, loading = false }: CredentialsProps) {
    const [sapUrl,      setSapUrl]      = useState("");
    const [sapUser,     setSapUser]     = useState("");
    const [sapPassword, setSapPassword] = useState("");

    const isDisabled = loading || !sapUrl.trim() || !sapUser.trim() || !sapPassword;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="sap-url">SAP URL</Label>
                <Input
                    id="sap-url"
                    type="url"
                    placeholder="https://your-sap-system.example.com"
                    value={sapUrl}
                    onChange={e => setSapUrl(e.target.value)}
                    disabled={loading}
                    autoComplete="url"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="sap-user">Username</Label>
                <Input
                    id="sap-user"
                    placeholder="SAP username"
                    value={sapUser}
                    onChange={e => setSapUser(e.target.value)}
                    disabled={loading}
                    autoComplete="username"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="sap-password">Password</Label>
                <Input
                    id="sap-password"
                    type="password"
                    placeholder="SAP password"
                    value={sapPassword}
                    onChange={e => setSapPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                />
            </div>

            <Button
                className="w-full mt-2"
                disabled={isDisabled}
                onClick={() => onConnect({ sapUrl: sapUrl.trim(), sapUser: sapUser.trim(), sapPassword })}
            >
                {loading ? "Connecting…" : "Connect"}
            </Button>
        </div>
    );
}
