<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QualityCheck extends Model
{
    use HasFactory;

    protected $fillable = [
        'check_number',
        'product_name',
        'batch_number',
        'check_type',
        'test_parameter',
        'expected_value',
        'actual_value',
        'tolerance_min',
        'tolerance_max',
        'result',
        'status',
        'check_date',
        'check_time',
        'observations',
        'corrective_actions',
        'equipment_used',
        'inspector_id',
        'production_id',
    ];

    protected $casts = [
        'check_date' => 'date',
        'check_time' => 'datetime:H:i',
        'expected_value' => 'decimal:3',
        'actual_value' => 'decimal:3',
        'tolerance_min' => 'decimal:3',
        'tolerance_max' => 'decimal:3',
    ];

    /**
     * Get the inspector for this quality check
     */
    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    /**
     * Get the production for this quality check
     */
    public function production()
    {
        return $this->belongsTo(Production::class);
    }

    /**
     * Check if the test passed
     */
    public function isPassed()
    {
        return $this->result === 'pass';
    }

    /**
     * Check if the test failed
     */
    public function isFailed()
    {
        return $this->result === 'fail';
    }

    /**
     * Get deviation from expected value
     */
    public function getDeviationAttribute()
    {
        return round($this->actual_value - $this->expected_value, 3);
    }

    /**
     * Get deviation percentage
     */
    public function getDeviationPercentageAttribute()
    {
        if ($this->expected_value == 0) return 0;
        return round((($this->actual_value - $this->expected_value) / $this->expected_value) * 100, 2);
    }
}
