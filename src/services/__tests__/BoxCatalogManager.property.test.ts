import fc from 'fast-check'
import { BoxCatalogManager } from '../BoxCatalogManager'
import { prisma } from '../../config/database'
import { Box } from '../../types'

/**
 * Property 4: Optimal box selection (smallest suitable box)
 * Validates: Requirements 2.8, 2.9, 3.8
 */

describe('BoxCatalogManager - Property-Based Tests', () => {
  let boxCatalogManager: BoxCatalogManager

  beforeAll(() => {
    boxCatalogManager = new BoxCatalogManager()
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.order.deleteMany()
    await prisma.box.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('Property 4: Optimal box selection', () => {
    it('should always select the smallest suitable box', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a set of boxes with varying sizes
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              length: fc.float({ min: 10, max: 200, noNaN: true }),
              width: fc.float({ min: 10, max: 200, noNaN: true }),
              height: fc.float({ min: 10, max: 200, noNaN: true }),
              maxWeight: fc.float({ min: 1, max: 100, noNaN: true }),
            }),
            { minLength: 3, maxLength: 10 }
          ),
          // Generate required dimensions
          fc.record({
            length: fc.float({ min: 5, max: 100, noNaN: true }),
            width: fc.float({ min: 5, max: 100, noNaN: true }),
            height: fc.float({ min: 5, max: 100, noNaN: true }),
          }),
          // Generate required weight
          fc.float({ min: 0.1, max: 50, noNaN: true }),
          async (boxDefs, requiredDimensions, requiredWeight) => {
            // Create boxes in database
            const createdBoxes: Box[] = []
            for (const boxDef of boxDefs) {
              try {
                const box = await boxCatalogManager.addBox({
                  ...boxDef,
                  isActive: true,
                })
                createdBoxes.push(box)
              } catch (error) {
                // Skip invalid boxes
                continue
              }
            }

            // Skip if no boxes were created
            if (createdBoxes.length === 0) {
              return true
            }

            // Find suitable boxes
            const suitableBoxes = await boxCatalogManager.findSuitableBoxes(
              requiredDimensions,
              requiredWeight
            )

            // If no suitable boxes found, verify that no box can fit
            if (suitableBoxes.length === 0) {
              const canAnyBoxFit = createdBoxes.some((box) => {
                const boxDims = [box.length, box.width, box.height].sort((a, b) => b - a)
                const reqDims = [
                  requiredDimensions.length,
                  requiredDimensions.width,
                  requiredDimensions.height,
                ].sort((a, b) => b - a)

                const dimensionsFit =
                  boxDims[0] >= reqDims[0] && boxDims[1] >= reqDims[1] && boxDims[2] >= reqDims[2]
                const weightFits = box.maxWeight >= requiredWeight

                return dimensionsFit && weightFits
              })

              // Property: If no suitable boxes returned, no box should fit
              expect(canAnyBoxFit).toBe(false)
              return true
            }

            // Property 1: All returned boxes must fit the requirements
            for (const box of suitableBoxes) {
              // Check weight constraint
              expect(box.maxWeight).toBeGreaterThanOrEqual(requiredWeight)

              // Check dimension constraints (considering all orientations)
              const boxDims = [box.length, box.width, box.height].sort((a, b) => b - a)
              const reqDims = [
                requiredDimensions.length,
                requiredDimensions.width,
                requiredDimensions.height,
              ].sort((a, b) => b - a)

              expect(boxDims[0]).toBeGreaterThanOrEqual(reqDims[0])
              expect(boxDims[1]).toBeGreaterThanOrEqual(reqDims[1])
              expect(boxDims[2]).toBeGreaterThanOrEqual(reqDims[2])
            }

            // Property 2: Boxes must be sorted by volume ascending
            for (let i = 1; i < suitableBoxes.length; i++) {
              expect(suitableBoxes[i].volume).toBeGreaterThanOrEqual(suitableBoxes[i - 1].volume)
            }

            // Property 3: The first box (smallest) must be optimal
            // Any box with smaller volume than the selected box should not fit
            const selectedBox = suitableBoxes[0]
            const smallerBoxes = createdBoxes.filter((box) => box.volume < selectedBox.volume)

            for (const smallerBox of smallerBoxes) {
              const boxDims = [smallerBox.length, smallerBox.width, smallerBox.height].sort(
                (a, b) => b - a
              )
              const reqDims = [
                requiredDimensions.length,
                requiredDimensions.width,
                requiredDimensions.height,
              ].sort((a, b) => b - a)

              const dimensionsFit =
                boxDims[0] >= reqDims[0] && boxDims[1] >= reqDims[1] && boxDims[2] >= reqDims[2]
              const weightFits = smallerBox.maxWeight >= requiredWeight

              // Property: Smaller boxes should not fit both constraints
              expect(dimensionsFit && weightFits).toBe(false)
            }

            return true
          }
        ),
        { numRuns: 50 }
      )
    })

    it('should handle edge cases correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate edge case dimensions
          fc.oneof(
            fc.constant({ length: 0.1, width: 0.1, height: 0.1 }), // Very small
            fc.constant({ length: 1000, width: 1000, height: 1000 }), // Very large
            fc.constant({ length: 10, width: 10, height: 100 }), // Very tall
            fc.constant({ length: 100, width: 100, height: 1 }) // Very flat
          ),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          async (dimensions, weight) => {
            // Create a few standard boxes
            const standardBoxes = [
              { name: 'Small', length: 20, width: 15, height: 10, maxWeight: 5, isActive: true },
              { name: 'Medium', length: 40, width: 30, height: 25, maxWeight: 15, isActive: true },
              { name: 'Large', length: 60, width: 50, height: 40, maxWeight: 30, isActive: true },
            ]

            for (const boxDef of standardBoxes) {
              await boxCatalogManager.addBox(boxDef)
            }

            // Should not throw error
            const suitableBoxes = await boxCatalogManager.findSuitableBoxes(dimensions, weight)

            // Result should be an array (possibly empty)
            expect(Array.isArray(suitableBoxes)).toBe(true)

            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('should respect active/inactive status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            length: fc.float({ min: 10, max: 100, noNaN: true }),
            width: fc.float({ min: 10, max: 100, noNaN: true }),
            height: fc.float({ min: 10, max: 100, noNaN: true }),
          }),
          fc.float({ min: 0.1, max: 50, noNaN: true }),
          async (dimensions, weight) => {
            // Create an active box that fits
            const activeBox = await boxCatalogManager.addBox({
              name: 'Active Box',
              length: dimensions.length + 10,
              width: dimensions.width + 10,
              height: dimensions.height + 10,
              maxWeight: weight + 10,
              isActive: true,
            })

            // Create an inactive box that also fits
            const inactiveBox = await boxCatalogManager.addBox({
              name: 'Inactive Box',
              length: dimensions.length + 5,
              width: dimensions.width + 5,
              height: dimensions.height + 5,
              maxWeight: weight + 5,
              isActive: false,
            })

            // Find suitable boxes
            const suitableBoxes = await boxCatalogManager.findSuitableBoxes(dimensions, weight)

            // Property: Only active boxes should be returned
            const inactiveBoxInResults = suitableBoxes.some((box) => box.id === inactiveBox.id)
            expect(inactiveBoxInResults).toBe(false)

            // Property: Active box should be in results
            const activeBoxInResults = suitableBoxes.some((box) => box.id === activeBox.id)
            expect(activeBoxInResults).toBe(true)

            return true
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})
