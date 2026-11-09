import { DEMO_ADMIN, DEMO_MEMBER, DEMO_PASSWORD } from './fixtures';

export default function DemoAccounts(props: { onSelect: (email: string, password: string) => void }) {
  return <details class="demo-accounts" open><summary>Akun untuk mencoba demo</summary><p>Password seluruh akun demo: <code>{DEMO_PASSWORD}</code></p><div class="demo-account-actions"><button type="button" class="button secondary" onClick={() => props.onSelect(DEMO_MEMBER, DEMO_PASSWORD)}>Isi akun Member</button><button type="button" class="button secondary" onClick={() => props.onSelect(DEMO_ADMIN, DEMO_PASSWORD)}>Isi akun Admin</button></div><p class="small muted">Uji akun nonaktif: nonaktif@demo.readonly.test</p></details>;
}
