<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Production extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_name',
        'batch_number',
        'quantity_produced',
        'quantity_target',
        'production_cost',
        'production_line',
        'shift',
        'status',
        'production_date',
        'start_time',
        'end_time',
        'notes',
        'supervisor_id',
    ];

    protected $casts = [
        'production_date' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'production_cost' => 'decimal:2',
    ];

    /**
     * Get the supervisor for this production
     */
    public function supervisor()
    {
        return $this->belongsTo(User::class, 'supervisor_id');
    }

    /**
     * Get quality checks for this production
     */
    public function qualityChecks()
    {
        return $this->hasMany(QualityCheck::class);
    }

    /**
     * Get production details for this production
     */
    public function productionDetails()
    {
        return $this->hasMany(ProductionDetail::class);
    }

    /**
     * Get raw materials used in this production
     */
    public function rawMaterials()
    {
        return $this->belongsToMany(RawMaterial::class, 'production_details')
                    ->withPivot('planned_quantity', 'actual_quantity', 'unit_cost', 'total_cost', 'waste_quantity', 'notes')
                    ->withTimestamps();
    }

    /**
     * Calculate total material cost for this production
     */
    public function getTotalMaterialCostAttribute()
    {
        return $this->productionDetails->sum('total_cost');
    }

    /**
     * Calculate efficiency percentage
     */
    public function getEfficiencyAttribute()
    {
        if ($this->quantity_target == 0) return 0;
        return round(($this->quantity_produced / $this->quantity_target) * 100, 2);
    }

    /**
     * Check if production is completed
     */
    public function isCompleted()
    {
        return $this->status === 'completed';
    }
}
