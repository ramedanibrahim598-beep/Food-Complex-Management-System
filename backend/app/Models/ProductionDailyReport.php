<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionDailyReport extends Model
{
    use HasFactory;

    protected $fillable = [
        'report_date',
        'total_batches',
        'completed_batches',
        'in_progress_batches',
        'total_produced',
        'total_target',
        'efficiency',
        'issues',
        'recommendations',
        'submitted_by_id',
    ];

    protected $casts = [
        'report_date' => 'date',
        'total_produced' => 'decimal:2',
        'total_target' => 'decimal:2',
        'efficiency' => 'decimal:2',
    ];

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by_id');
    }
}
