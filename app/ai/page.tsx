import Sidebar from '@/components/Sidebar'
import AIChat from '@/components/AIChat'

export default function AIPage() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100dvh' }}>
      <aside style={{ borderRight: '1px solid #e5e7eb' }}>
        <Sidebar />
      </aside>
      <main style={{ padding: 16, display: 'grid', gap: 16, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div className="trip-cover" style={{ borderRadius: 16, padding: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>Trip AI</h1>
          <div style={{ opacity: .9 }}>Chat with the assistant. Open from a trip to include its context.</div>
        </div>
        <AIChat />
      </main>
    </div>
  )
}
