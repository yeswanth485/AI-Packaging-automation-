'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table'
import { Badge } from '@/components/ui/Badge'
import { LoadingScreen } from '@/components/ui/Spinner'
import { Plus, Edit, Trash2 } from 'lucide-react'
import type { Box, APIError } from '@/lib/types'

export default function BoxesPage() {
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingBox, setEditingBox] = useState<Box | null>(null)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    length: '',
    width: '',
    height: '',
    cost: '',
    maxWeight: '',
  })

  useEffect(() => {
    loadBoxes()
  }, [])

  const loadBoxes = async () => {
    try {
      const response = await api.getBoxes()
      setBoxes(response.data || [])
    } catch (err) {
      const error = err as APIError
      setError(error.response?.data?.message || 'Failed to load boxes')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const data = {
        name: formData.name,
        length: parseFloat(formData.length),
        width: parseFloat(formData.width),
        height: parseFloat(formData.height),
        cost: parseFloat(formData.cost),
        maxWeight: parseFloat(formData.maxWeight),
      }

      if (editingBox) {
        await api.updateBox(editingBox.id, data)
        addToast('Box updated successfully', 'success')
      } else {
        await api.createBox(data)
        addToast('Box created successfully', 'success')
      }

      setShowModal(false)
      setEditingBox(null)
      resetForm()
      loadBoxes()
    } catch (err) {
      const error = err as APIError
      const errorMessage = error.response?.data?.message || 'Failed to save box'
      setError(errorMessage)
      addToast(errorMessage, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (box: Box) => {
    setEditingBox(box)
    setFormData({
      name: box.name,
      length: box.length.toString(),
      width: box.width.toString(),
      height: box.height.toString(),
      cost: box.cost.toString(),
      maxWeight: box.maxWeight?.toString() || '',
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this box?')) return

    try {
      await api.deleteBox(id)
      addToast('Box deleted successfully', 'success')
      loadBoxes()
    } catch (err) {
      const error = err as APIError
      const errorMessage = error.response?.data?.message || 'Failed to delete box'
      addToast(errorMessage, 'error')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      length: '',
      width: '',
      height: '',
      cost: '',
      maxWeight: '',
    })
  }

  const openAddModal = () => {
    setEditingBox(null)
    resetForm()
    setShowModal(true)
  }

  if (loading) return <LoadingScreen message="Loading boxes..." />

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Box Catalog</h1>
        <Button onClick={openAddModal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Box
        </Button>
      </div>

      {error && <Alert variant="error" className="mb-6">{error}</Alert>}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Dimensions (L×W×H)</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Max Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {boxes.map((box) => (
                <TableRow key={box.id}>
                  <TableCell className="font-medium">{box.name}</TableCell>
                  <TableCell>{box.length} × {box.width} × {box.height}</TableCell>
                  <TableCell>{(box.length * box.width * box.height).toFixed(0)} in³</TableCell>
                  <TableCell>${box.cost.toFixed(2)}</TableCell>
                  <TableCell>{box.maxWeight} lbs</TableCell>
                  <TableCell>
                    <Badge variant={box.isActive ? 'success' : 'secondary'}>
                      {box.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => handleEdit(box)}
                      variant="ghost"
                      size="sm"
                      className="mr-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(box.id)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingBox(null)
          resetForm()
        }}
        title={editingBox ? 'Edit Box' : 'Add Box'}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Length"
                type="number"
                step="0.01"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                required
              />
              <Input
                label="Width"
                type="number"
                step="0.01"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                required
              />
              <Input
                label="Height"
                type="number"
                step="0.01"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                required
              />
            </div>
            <Input
              label="Cost ($)"
              type="number"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              required
            />
            <Input
              label="Max Weight (lbs)"
              type="number"
              step="0.01"
              value={formData.maxWeight}
              onChange={(e) => setFormData({ ...formData, maxWeight: e.target.value })}
              required
            />
          </div>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false)
                setEditingBox(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={saving}>
              {editingBox ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
