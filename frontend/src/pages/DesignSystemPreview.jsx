import { useState } from 'react'
import { Search, Settings2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  PageHeading,
  Select,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Toast,
  Tooltip,
} from '../components/ui.jsx'

const statuses = ['Available', 'Pending', 'Approved', 'Partially fulfilled', 'Rejected', 'Expired']

export default function DesignSystemPreview() {
  const [modalOpen, setModalOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [toastVisible, setToastVisible] = useState(true)

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-8 bg-canvas px-4 py-8 text-ink sm:px-8">
      <PageHeading eyebrow="Development only · Phase 2" title="Design system preview" description="Shared UI components and theme tokens. This route is available only in development." />

      <Card className="space-y-4 p-5">
        <h2 className="text-section-heading font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="icon-only" aria-label="Search"><Search size={17} /></Button>
          <Button variant="quiet">Legacy quiet alias</Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="text-section-heading font-semibold">Fields and badges</h2>
          <Input id="preview-name" label="Name" placeholder="Enter a fictional name" hint="Supporting text uses the shared type scale." />
          <Input id="preview-error" label="Example error" defaultValue="" error="This field needs attention." />
          <Select id="preview-status" label="Status" defaultValue="Available">
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </Select>
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">Neutral</Badge><Badge tone="success">Success</Badge><Badge tone="info">Info</Badge>
            <Badge tone="warning">Warning</Badge><Badge tone="danger">Critical</Badge><Badge tone="violet">Violet</Badge>
          </div>
          <div className="flex flex-wrap gap-2">{statuses.map((status) => <StatusBadge key={status}>{status}</StatusBadge>)}</div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-section-heading font-semibold">Overlays and feedback</h2>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Tooltip content="The icon-only button has a keyboard-accessible tooltip.">
              <Button variant="icon-only" aria-label="Preview settings"><Settings2 size={17} /></Button>
            </Tooltip>
          </div>
          {toastVisible && <Toast tone="success" message="This is a preview toast message." onDismiss={() => setToastVisible(false)} />}
          <div className="space-y-2" aria-label="Skeleton examples">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border p-5"><h2 className="text-section-heading font-semibold">Table basics</h2></div>
        <Table>
          <TableHead><TableRow><TableHeader>Reference</TableHeader><TableHeader>Group</TableHeader><TableHeader>Status</TableHeader></TableRow></TableHead>
          <TableBody>
            <TableRow><TableCell className="font-medium">DEMO-001</TableCell><TableCell>O+</TableCell><TableCell><StatusBadge>Available</StatusBadge></TableCell></TableRow>
            <TableRow><TableCell className="font-medium">DEMO-002</TableCell><TableCell>A−</TableCell><TableCell><StatusBadge>Pending</StatusBadge></TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Preview modal"
        description="Native dialog semantics provide focus containment and Escape-to-close behavior."
        footer={<div className="flex justify-end"><Button onClick={() => setModalOpen(false)}>Done</Button></div>}
      >
        <p className="text-body leading-6 text-muted">Use this shared surface for short, focused tasks.</p>
      </Modal>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Preview drawer"
        description="A side panel for detail views and secondary workflows."
        footer={<div className="flex justify-end"><Button variant="secondary" onClick={() => setDrawerOpen(false)}>Close</Button></div>}
      >
        <p className="text-body leading-6 text-muted">The drawer uses the same accessible overlay foundation.</p>
      </Drawer>
    </main>
  )
}
