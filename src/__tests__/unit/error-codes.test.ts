import assert from 'node:assert/strict'
import { ERROR_CODES } from '@/lib/error-codes'

assert.equal(ERROR_CODES.VALIDATION_FAILED, 'VALIDATION_FAILED')
assert.equal(ERROR_CODES.INTERNAL_ERROR, 'INTERNAL_ERROR')

console.log('error-codes.test passed')
