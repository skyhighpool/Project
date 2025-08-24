'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { 
  Upload, 
  MapPin, 
  Clock, 
  Smartphone,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

const uploadSchema = z.object({
  gpsLat: z.number().min(-90).max(90),
  gpsLng: z.number().min(-180).max(180),
  recordedAt: z.string().min(1, 'Recording time is required'),
  deviceHash: z.string().min(1, 'Device hash is required'),
})

type UploadFormData = z.infer<typeof uploadSchema>

interface VideoUploadProps {
  onSuccess: () => void
}

export function VideoUpload({ onSuccess }: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
  })

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file')
        return
      }
      
      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB')
        return
      }
      
      setSelectedFile(file)
      setError('')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    maxFiles: 1,
    multiple: false
  })

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setGpsLocation({ lat: latitude, lng: longitude })
          setValue('gpsLat', latitude)
          setValue('gpsLng', longitude)
        },
        (error) => {
          console.error('Error getting location:', error)
          setError('Unable to get your location. Please enter coordinates manually.')
        }
      )
    } else {
      setError('Geolocation is not supported by your browser.')
    }
  }

  const generateDeviceHash = () => {
    // In a real app, this would generate a unique device identifier
    const hash = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15)
    setValue('deviceHash', hash)
  }

  const setCurrentTime = () => {
    const now = new Date()
    const timeString = now.toISOString().slice(0, 16) // Format: YYYY-MM-DDTHH:MM
    setValue('recordedAt', timeString)
  }

  const onSubmit = async (data: UploadFormData) => {
    if (!selectedFile) {
      setError('Please select a video file')
      return
    }

    setIsUploading(true)
    setError('')
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      // Create form data
      const formData = new FormData()
      formData.append('video', selectedFile)
      formData.append('gpsLat', data.gpsLat.toString())
      formData.append('gpsLng', data.gpsLng.toString())
      formData.append('recordedAt', data.recordedAt)
      formData.append('deviceHash', data.deviceHash)

      const token = localStorage.getItem('accessToken')
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const result = await response.json()
        console.log('Upload successful:', result)
        
        // Reset form
        setSelectedFile(null)
        setGpsLocation(null)
        setUploadProgress(0)
        
        // Notify parent component
        onSuccess()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Upload failed. Please try again.')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Video</h2>
        <p className="text-gray-600">
          Submit a video of proper waste disposal to earn points and rewards.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File
          </label>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive 
                ? 'border-primary-400 bg-primary-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
              ${selectedFile ? 'border-success-400 bg-success-50' : ''}
            `}
          >
            <input {...getInputProps()} />
            {selectedFile ? (
              <div className="space-y-2">
                <CheckCircle className="h-12 w-12 text-success-600 mx-auto" />
                <p className="text-lg font-medium text-success-900">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-success-600">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                  }}
                >
                  Remove file
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop the video here' : 'Drag & drop a video file'}
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse (MP4, MOV, AVI, MKV up to 100MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* GPS Coordinates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GPS Coordinates
            </label>
            <div className="flex space-x-2">
              <Input
                placeholder="Latitude"
                type="number"
                step="any"
                {...register('gpsLat', { valueAsNumber: true })}
                error={errors.gpsLat?.message}
                leftIcon={<MapPin className="h-4 w-4" />}
              />
              <Input
                placeholder="Longitude"
                type="number"
                step="any"
                {...register('gpsLng', { valueAsNumber: true })}
                error={errors.gpsLng?.message}
                leftIcon={<MapPin className="h-4 w-4" />}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              className="mt-2"
              leftIcon={<MapPin className="h-4 w-4" />}
            >
              Get Current Location
            </Button>
            {gpsLocation && (
              <p className="text-sm text-success-600 mt-1">
                Location captured: {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recording Time
            </label>
            <Input
              type="datetime-local"
              {...register('recordedAt')}
              error={errors.recordedAt?.message}
              leftIcon={<Clock className="h-4 w-4" />}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={setCurrentTime}
              className="mt-2"
              leftIcon={<Clock className="h-4 w-4" />}
            >
              Set Current Time
            </Button>
          </div>
        </div>

        {/* Device Hash */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Device Identifier
          </label>
          <Input
            placeholder="Device hash will be generated automatically"
            {...register('deviceHash')}
            error={errors.deviceHash?.message}
            leftIcon={<Smartphone className="h-4 w-4" />}
            readOnly
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateDeviceHash}
            className="mt-2"
            leftIcon={<Smartphone className="h-4 w-4" />}
          >
            Generate Device Hash
          </Button>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-md">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-danger-400 mr-2" />
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isUploading || !selectedFile}
          isLoading={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Submit Video'}
        </Button>
      </form>

      {/* Upload Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Upload Guidelines</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Video must show proper waste disposal in designated bins</li>
          <li>• Minimum duration: 10 seconds</li>
          <li>• Maximum file size: 100MB</li>
          <li>• GPS location must be within designated areas</li>
          <li>• One submission per location per day</li>
        </ul>
      </div>
    </div>
  )
}