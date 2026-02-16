<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\QualityCheck;
use App\Models\Production;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class QualityControllerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create Quality Controller user
        $qualityController = User::firstOrCreate(
            ['email' => 'quality@example.com'],
            [
                'name' => 'Quality Controller',
                'password' => Hash::make('password123'),
                'role' => 'quality_controller',
                'is_active' => true,
            ]
        );

        echo "Quality Controller user created: {$qualityController->email}\n";

        // Create additional quality checks for existing productions
        $productions = Production::all();
        
        if ($productions->count() > 0) {
            $defectTypes = [
                'Surface defects',
                'Dimensional variance',
                'Color inconsistency',
                'Packaging issues',
                'Contamination',
                'Structural defects',
                'Weight variance',
                'Texture issues',
                'Temperature deviation',
                'pH imbalance'
            ];

            $statuses = ['passed', 'failed', 'pending'];
            $statusWeights = [70, 20, 10]; // 70% passed, 20% failed, 10% pending

            foreach ($productions->take(25) as $production) {
                // Skip if quality check already exists
                if (QualityCheck::where('production_id', $production->id)->exists()) {
                    continue;
                }

                $status = $this->getWeightedRandomStatus($statuses, $statusWeights);
                $sampleSize = rand(50, 500);
                $defectCount = 0;
                $defectType = null;

                if ($status === 'failed') {
                    $defectCount = rand(1, 20);
                    $defectType = $defectTypes[array_rand($defectTypes)];
                }

                QualityCheck::create([
                    'production_id' => $production->id,
                    'inspector_id' => $qualityController->id,
                    'check_date' => $production->production_date,
                    'status' => $status,
                    'defect_type' => $defectType,
                    'defect_count' => $defectCount,
                    'sample_size' => $sampleSize,
                    'notes' => $this->generateNotes($status, $defectType),
                ]);
            }

            echo "Quality checks created for " . min(25, $productions->count()) . " productions\n";
        }
    }

    private function getWeightedRandomStatus($statuses, $weights)
    {
        $totalWeight = array_sum($weights);
        $random = rand(1, $totalWeight);
        
        $currentWeight = 0;
        foreach ($statuses as $index => $status) {
            $currentWeight += $weights[$index];
            if ($random <= $currentWeight) {
                return $status;
            }
        }
        
        return $statuses[0];
    }

    private function generateNotes($status, $defectType)
    {
        $notes = [
            'passed' => [
                'All quality parameters within acceptable limits',
                'Product meets all quality standards',
                'No defects detected during inspection',
                'Quality check completed successfully',
                'All samples passed inspection criteria'
            ],
            'failed' => [
                'Multiple defects found requiring rework',
                'Quality standards not met, batch rejected',
                'Significant issues identified during inspection',
                'Product does not meet quality requirements',
                'Immediate corrective action required'
            ],
            'pending' => [
                'Awaiting additional test results',
                'Quality check in progress',
                'Pending supervisor review',
                'Additional sampling required',
                'Waiting for lab analysis results'
            ]
        ];

        $baseNote = $notes[$status][array_rand($notes[$status])];
        
        if ($status === 'failed' && $defectType) {
            $baseNote .= ". Primary issue: {$defectType}";
        }

        return $baseNote;
    }
}