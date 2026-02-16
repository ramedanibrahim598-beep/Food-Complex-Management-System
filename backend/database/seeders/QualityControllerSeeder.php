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

        // Create additional quality checks for existing productions.
        // Keep this seeder idempotent by skipping productions that already have checks.
        $productions = Production::all();

        if ($productions->count() > 0) {
            $checkTypes = ['incoming', 'in_process', 'final', 'random'];
            $equipment = ['Digital Scale', 'Thermometer', 'pH Meter', 'Moisture Analyzer'];
            $testProfiles = [
                ['param' => 'weight', 'expected' => 100.000, 'tol_min' => 95.000, 'tol_max' => 105.000],
                ['param' => 'temperature', 'expected' => 25.000, 'tol_min' => 22.000, 'tol_max' => 28.000],
                ['param' => 'moisture', 'expected' => 12.000, 'tol_min' => 10.000, 'tol_max' => 14.000],
                ['param' => 'ph', 'expected' => 7.000, 'tol_min' => 6.500, 'tol_max' => 7.500],
            ];

            $resultWeights = [
                'pass' => 70,
                'fail' => 20,
                'warning' => 10,
            ];

            foreach ($productions->take(25) as $production) {
                // Skip if quality check already exists for this production.
                if (QualityCheck::where('production_id', $production->id)->exists()) {
                    continue;
                }

                $result = $this->weightedChoice($resultWeights);
                $profile = $testProfiles[array_rand($testProfiles)];
                $expectedValue = (float) $profile['expected'];
                $toleranceMin = (float) $profile['tol_min'];
                $toleranceMax = (float) $profile['tol_max'];

                $actualValue = $this->generateActualValue($result, $toleranceMin, $toleranceMax);
                $checkDate = $production->production_date ? Carbon::parse($production->production_date) : Carbon::now();
                $dbStatus = $result === 'warning' ? 'pending' : 'completed';
                $checkNumber = sprintf('QC-%s-%04d', $checkDate->format('Ymd'), $production->id);

                QualityCheck::create([
                    'check_number' => $checkNumber,
                    'product_name' => $production->product_name,
                    'batch_number' => $production->batch_number,
                    'check_type' => $checkTypes[array_rand($checkTypes)],
                    'test_parameter' => $profile['param'],
                    'expected_value' => $expectedValue,
                    'actual_value' => $actualValue,
                    'tolerance_min' => $toleranceMin,
                    'tolerance_max' => $toleranceMax,
                    'result' => $result,
                    'status' => $dbStatus,
                    'check_date' => $checkDate->toDateString(),
                    'check_time' => Carbon::now()->format('H:i:s'),
                    'observations' => $this->buildObservation($result),
                    'corrective_actions' => $result === 'fail' ? 'Adjust process parameters and recheck batch.' : null,
                    'equipment_used' => $equipment[array_rand($equipment)],
                    'production_id' => $production->id,
                    'inspector_id' => $qualityController->id,
                ]);
            }

            echo "Quality checks created for " . min(25, $productions->count()) . " productions\n";
        }
    }

    private function weightedChoice(array $weights): string
    {
        $totalWeight = array_sum($weights);
        $random = rand(1, $totalWeight);

        $currentWeight = 0;
        foreach ($weights as $value => $weight) {
            $currentWeight += $weight;
            if ($random <= $currentWeight) {
                return $value;
            }
        }

        return 'pass';
    }

    private function generateActualValue(string $result, float $toleranceMin, float $toleranceMax): float
    {
        if ($result === 'pass') {
            return round(mt_rand((int) ($toleranceMin * 1000), (int) ($toleranceMax * 1000)) / 1000, 3);
        }

        if ($result === 'warning') {
            // Slightly outside tolerance range.
            $delta = 0.5;
            $pickUpper = (bool) rand(0, 1);
            $value = $pickUpper ? ($toleranceMax + $delta) : ($toleranceMin - $delta);
            return round($value, 3);
        }

        // Fail: clearly outside tolerance range.
        $delta = 2.0;
        $pickUpper = (bool) rand(0, 1);
        $value = $pickUpper ? ($toleranceMax + $delta) : ($toleranceMin - $delta);
        return round($value, 3);
    }

    private function buildObservation(string $result): string
    {
        if ($result === 'pass') {
            return 'All quality parameters are within acceptable limits.';
        }

        if ($result === 'warning') {
            return 'Minor deviation observed; monitoring is required.';
        }

        return 'Quality standards not met; corrective action required.';
    }
}
